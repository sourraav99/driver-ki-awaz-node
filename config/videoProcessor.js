const { GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const s3Client = require("./s3");
const fs = require("fs");
const path = require("path");
const { convertToHLS } = require("../utils/ffmpeg");
const ffmpeg = require("fluent-ffmpeg");
const db = require("./db");
const { pipeline } = require("stream/promises");

exports.processVideo = async (uploadId, s3Key, originalLocation, thumbnailUrl) => {
    const tempDir = path.join(__dirname, "../tmp", uploadId);
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const localVideoPath = path.join(tempDir, "original.mp4");
    const hlsFolder = path.join(tempDir, "hls");
    const thumbnailPath = path.join(tempDir, "thumbnail.jpg");

    try {
        console.log(`[Worker] Starting processing for ${uploadId}...`);

        // 1. Download original from S3
        const getCommand = new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: s3Key,
        });
        const { Body } = await s3Client.send(getCommand);
        
        // Safer stream handling with pipeline
        await pipeline(Body, fs.createWriteStream(localVideoPath));

        // 2. Generate Thumbnail IF NOT provided by frontend
        let finalThumbnailUrl = thumbnailUrl;
        if (!finalThumbnailUrl) {
            console.log(`[Worker] No thumbnail provided, generating one...`);
            await new Promise((resolve, reject) => {
                ffmpeg(localVideoPath)
                    .screenshots({
                        timestamps: ["1"],
                        filename: "thumbnail.jpg",
                        folder: tempDir,
                        size: "320x240",
                    })
                    .on("end", resolve)
                    .on("error", (err) => {
                        console.error("[Worker] Thumbnail generation error:", err);
                        reject(err);
                    });
            });
        }

        // 3. Convert to HLS
        await convertToHLSAsync(localVideoPath, hlsFolder);

        // 4. Upload HLS & Thumbnail (if generated) back to S3
        const hlsFiles = fs.readdirSync(hlsFolder);
        const uploadPromises = hlsFiles.map(async (file) => {
            const filePath = path.join(hlsFolder, file);
            const fileStream = fs.createReadStream(filePath);
            const putCommand = new PutObjectCommand({
                Bucket: process.env.AWS_S3_BUCKET,
                Key: `processed/${uploadId}/hls/${file}`,
                Body: fileStream,
                ContentType: file.endsWith(".m3u8") ? "application/x-mpegURL" : "video/MP2T",
            });
            return s3Client.send(putCommand);
        });

        if (!thumbnailUrl) {
            const thumbnailStream = fs.createReadStream(thumbnailPath);
            uploadPromises.push(s3Client.send(new PutObjectCommand({
                Bucket: process.env.AWS_S3_BUCKET,
                Key: `processed/${uploadId}/thumbnail.jpg`,
                Body: thumbnailStream,
                ContentType: "image/jpeg",
            })));
            finalThumbnailUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/processed/${uploadId}/thumbnail.jpg`;
        }

        await Promise.all(uploadPromises);

        // 5. Update DB
        const finalMediaUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/processed/${uploadId}/hls/index.m3u8`;

        await db.query(
            "UPDATE posts SET media_url = ?, thumbnail = ?, processing_status = 'ready' WHERE media_url = ?",
            [finalMediaUrl, finalThumbnailUrl, originalLocation]
        );
        
        await db.query(
            "UPDATE upload_sessions SET status = 'completed' WHERE id = ?",
            [uploadId]
        );

        console.log(`[Worker] Processing complete for ${uploadId}`);

    } catch (error) {
        console.error(`[Worker] Processing FAILED for ${uploadId}:`, error);
        await db.query(
            "UPDATE posts SET processing_status = 'failed' WHERE media_url = ?",
            [originalLocation]
        ).catch(e => console.error("[Worker] DB Update Failed (posts):", e));
        
        await db.query(
            "UPDATE upload_sessions SET status = 'failed' WHERE id = ?",
            [uploadId]
        ).catch(e => console.error("[Worker] DB Update Failed (sessions):", e));
        
        throw error; 
    } finally {
        // Cleanup temp files
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
};

// Simple wrapper for convertToHLS to make it awaitable
function convertToHLSAsync(input, output) {
    return new Promise((resolve, reject) => {
        convertToHLS(input, output, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}
