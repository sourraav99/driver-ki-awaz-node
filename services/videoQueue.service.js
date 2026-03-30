const { Queue, Worker } = require("bullmq");
const redisConnection = require("../config/redis");
const { processVideo } = require("../config/videoProcessor");

// 1. Initialize the Queue
const videoQueue = new Queue("video-processing", {
    connection: redisConnection,
});

// 2. Initialize the Worker
const videoWorker = new Worker(
    "video-processing",
    async (job) => {
        const { uploadId, s3Key, originalLocation, thumbnailUrl } = job.data;
        
        // Calculate if this is the last allowed attempt
        // job.attemptsMade starts at 0 for the first attempt.
        // If attempts: 3, then it's the last attempt when attemptsMade is 2.
        const maxAttempts = job.opts.attempts || 1;
        const isLastAttempt = (job.attemptsMade + 1) >= maxAttempts;

        console.log(`[Worker] Started processing job ${job.id} (Attempt ${job.attemptsMade + 1}/${maxAttempts}) for ${uploadId}`);
        
        try {
            await processVideo(uploadId, s3Key, originalLocation, thumbnailUrl, isLastAttempt);
            console.log(`[Worker] Successfully completed job ${job.id}`);
        } catch (error) {
            console.error(`[Worker] Job ${job.id} FAILED:`, error);
            throw error; // Let BullMQ handle retries
        }
    },
    {
        connection: redisConnection,
        concurrency: 2, // Limit to 2 videos at a time
    }
);

videoWorker.on("completed", (job) => {
    console.log(`Job ${job.id} has completed!`);
});

videoWorker.on("failed", (job, err) => {
    console.error(`Job ${job.id} has failed with ${err.message}`);
});

module.exports = { videoQueue };
