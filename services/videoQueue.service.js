const { Queue, Worker } = require("bullmq");
const redisConnection = require("../config/redis");
const { processVideo } = require("../config/videoProcessor");

const MAX_ATTEMPTS = 3;

// 1. Initialize the Queue
const videoQueue = new Queue("video-processing", {
    connection: redisConnection,
});

// 2. Initialize the Worker
const videoWorker = new Worker(
    "video-processing",
    async (job) => {
        const { uploadId, s3Key, originalLocation, thumbnailUrl } = job.data;
        
        const isLastAttempt = (job.attemptsMade + 1) >= MAX_ATTEMPTS;

        console.log(`[Worker] Started processing job ${job.id} (Attempt ${job.attemptsMade + 1}/${MAX_ATTEMPTS}) for ${uploadId}`);
        
        try {
            await processVideo(uploadId, s3Key, originalLocation, thumbnailUrl, isLastAttempt);
            console.log(`[Worker] Successfully completed job ${job.id}`);
        } catch (error) {
            console.error(`[Worker] Job ${job.id} FAILED:`, error.message);
            if (!isLastAttempt) {
                console.log(`[Worker] Attempt ${job.attemptsMade + 1} failed. Scheduling RETRY ${job.attemptsMade + 2}/${MAX_ATTEMPTS}...`);
            } else {
                console.error(`[Worker] Final attempt ${MAX_ATTEMPTS} failed. No more retries.`);
            }
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

module.exports = { videoQueue, MAX_ATTEMPTS };
