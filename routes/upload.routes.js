const express = require("express");
const router = express.Router();
const uploadController = require("../controllers/upload.controller");

router.post("/init", uploadController.initUpload);
router.post("/complete", uploadController.completeUpload);
router.post("/thumbnail-presigned", uploadController.getThumbnailPresignedUrl);

module.exports = router;
