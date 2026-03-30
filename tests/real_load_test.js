const { videoQueue } = require("../services/videoQueue.service");
const { v4: uuidv4 } = require("uuid");

const REAL_S3_KEY = "raw-uploads/c58b21cc-c773-4470-9160-c191804bbb9d-upload_1774505145675.mp4";
const REAL_S3_LOCATION = `https://dka-video-uploads.s3.ap-southeast-2.amazonaws.com/${REAL_S3_KEY}`;

async function runRealLoadTest(count = 5) {
    console.log(`🎬 Starting REAL Load Test with ${count} processing jobs...`);
    console.log(`Using real file: ${REAL_S3_KEY}`);

    for (let i = 0; i < count; i++) {
        // We generate a unique uploadId so they use different local temp folders
        const fakeUploadIdForTest = `test-run-${Date.now()}-${i}`;
        
        console.log(`Adding job ${i + 1} to queue: ${fakeUploadIdForTest}`);
        await videoQueue.add("process-video", {
            uploadId: fakeUploadIdForTest, // Unique folder
            s3Key: REAL_S3_KEY,          // Same real file
            originalLocation: REAL_S3_LOCATION,
        });
    }

    console.log("✅ All 5 REAL jobs added to the queue!");
    console.log("Observe your Node server logs to see the actual FFmpeg transcoding in action (2 at a time).");
    process.exit(0);
}

// Running with 5 instead of 10 to save time/bandwidth, but enough to see concurrency
runRealLoadTest(5).catch(err => {
    console.error("Test Failed:", err);
    process.exit(1);
});
