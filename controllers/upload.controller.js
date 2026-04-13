const { CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const s3Client = require("../config/s3");
const uploadService = require("../services/upload.service");
const feedService = require("../services/feed.service");
const { videoQueue, MAX_ATTEMPTS } = require("../services/videoQueue.service");
const { v4: uuidv4 } = require("uuid");

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

exports.initUpload = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"];
        const { fileName, fileSize } = req.body;

        if (!userId || !fileName || !fileSize) {
            return res.status(400).json({ success: false, message: "userId, fileName, and fileSize are required" });
        }

        const uploadId = uuidv4();
        const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);

        const command = new CreateMultipartUploadCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: `raw-uploads/${uploadId}-${fileName}`,
            ContentType: "video/mp4", // Or detect from extension
        });

        const { UploadId } = await s3Client.send(command);

        // Store S3 UploadId in our session table (optional, but good for completion)
        await uploadService.createUploadSession(uploadId, userId, fileName, fileSize, totalChunks);

        const presignedUrls = [];
        for (let i = 1; i <= totalChunks; i++) {
            const partCommand = new UploadPartCommand({
                Bucket: process.env.AWS_S3_BUCKET,
                Key: `raw-uploads/${uploadId}-${fileName}`,
                UploadId: UploadId,
                PartNumber: i,
            });

            const url = await getSignedUrl(s3Client, partCommand, { expiresIn: 3600 });
            presignedUrls.push({ partNumber: i, url });
        }

        res.json({
            success: true,
            data: {
                uploadId,
                s3UploadId: UploadId,
                totalChunks,
                presignedUrls,
            },
        });
    } catch (error) {
        console.error("INIT UPLOAD ERROR:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.completeUpload = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"];
        const { uploadId, s3UploadId, parts, caption, category, thumbnailUrl } = req.body;

        if (!userId || !uploadId || !s3UploadId || !parts || !parts.length) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        const session = await uploadService.getUploadSession(uploadId);
        if (!session) {
            return res.status(404).json({ success: false, message: "Upload session not found" });
        }

        const s3Key = `raw-uploads/${uploadId}-${session.fileName}`;

        const command = new CompleteMultipartUploadCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: s3Key,
            UploadId: s3UploadId,
            MultipartUpload: {
                Parts: parts.sort((a, b) => a.PartNumber - b.PartNumber),
            },
        });

        const { Location } = await s3Client.send(command);

        // Update session status
        await uploadService.updateUploadSessionStatus(uploadId, "processing");

        // Create the post (initial state: pending)
        // We will store the S3 URL as the initial media_url
        const initialMediaUrl = Location; 
        
        // If thumbnailUrl is provided by frontend, we use it, otherwise NULL
        await feedService.createPost(userId, "video", initialMediaUrl, caption, category, thumbnailUrl || null, uploadId, "processing");

        // Trigger Background Processing via Queue with 3 retries
        await videoQueue.add("process-video", {
            uploadId,
            s3Key,
            originalLocation: Location,
            thumbnailUrl, // Pass to worker
        }, {
            attempts: MAX_ATTEMPTS,
            backoff: {
                type: "exponential",
                delay: 5000, // Wait 5s, then 10s, then 20s...
            },
        });

        res.json({
            success: true,
            message: "Upload completed. Video is processing.",
            data: {
                mediaUrl: Location,
            },
        });
    } catch (error) {
        console.error("COMPLETE UPLOAD ERROR:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getThumbnailPresignedUrl = async (req, res) => {
    try {
        const { fileName, fileType } = req.body;

        if (!fileName || !fileType) {
            return res.status(400).json({ success: false, message: "fileName and fileType are required" });
        }

        const uniqueFileName = `${uuidv4()}-${fileName}`;
        const s3Key = `thumbnails/${uniqueFileName}`;

        const command = new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: s3Key,
            ContentType: fileType,
        });

        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        const publicUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

        res.json({
            success: true,
            data: {
                uploadUrl,
                publicUrl,
                fileName: uniqueFileName,
            },
        });
    } catch (error) {
        console.error("THUMBNAIL PRESIGNED URL ERROR:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.retryUpload = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"];
        const { uploadId } = req.body;

        if (!userId || !uploadId) {
            return res.status(400).json({ success: false, message: "userId and uploadId are required" });
        }

        // 1. Get Session
        const session = await uploadService.getUploadSession(uploadId);
        if (!session) {
            return res.status(404).json({ success: false, message: "Upload session not found" });
        }

        // 2. Check if it's actually failed
        if (session.status !== "failed") {
            return res.status(400).json({ success: false, message: `Cannot retry a session with status: ${session.status}` });
        }

        // 3. Reconstruct the original Location (raw S3 URL) for the worker
        const s3Key = `raw-uploads/${uploadId}-${session.fileName}`;
        const originalLocation = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

        // 4. Reset statuses to trigger UI spinner
        await uploadService.updateUploadSessionStatus(uploadId, "processing");
        await feedService.updatePostStatusByUploadId(uploadId, "processing");

        // 5. Re-add to Queue
        await videoQueue.add("process-video", {
            uploadId,
            s3Key,
            originalLocation: originalLocation,
            thumbnailUrl: null, // Worker will regenerate if null
        }, {
            attempts: MAX_ATTEMPTS,
            backoff: {
                type: "exponential",
                delay: 5000,
            },
        });

        res.json({
            success: true,
            message: "Retry initiated. Video is processing again.",
        });

    } catch (error) {
        console.error("RETRY UPLOAD ERROR:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};