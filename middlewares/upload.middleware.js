const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {

    let folder = "text";

    // thumbnail field
    if (file.fieldname === "thumbnail") {
      folder = "thumbnails";
    }
    else if (file.mimetype.startsWith("video/")) {
      folder = "video";
    }
    else if (file.mimetype.startsWith("audio/")) {
      folder = "audio";
    }
    else if (file.mimetype.startsWith("image/")) {
      folder = "image";
    }

    const uploadPath = path.join("public/uploads", folder);

    // ensure folder exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  }
});

module.exports = upload;