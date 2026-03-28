const { videoQueue } = require("../services/videoQueue.service");
const { v4: uuidv4 } = require("uuid");

async function runLoadTest(count = 10) {
    console.log(`🚀 Starting Load Test with ${count} jobs...`);

    for (let i = 0; i < count; i++) {
        const uploadId = uuidv4();
        // Synthetic data pretending to be S3 locations
        const s3Key = `raw-uploads/test-${uploadId}.mp4`;
        const originalLocation = `https://dka-video-uploads.s3.ap-southeast-2.amazonaws.com/${s3Key}`;

        console.log(`Adding job ${i + 1}: ${uploadId}`);
        await videoQueue.add("process-video", {
            uploadId,
            s3Key,
            originalLocation,
        });
    }

    console.log("✅ All jobs added to the queue!");
    process.exit(0);
}

runLoadTest(10).catch(err => {
    console.error("Test Failed:", err);
    process.exit(1);
});
