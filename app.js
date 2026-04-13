const express = require("express");

const path = require("path");

const feedRoutes = require("./routes/feed.routes");
const userRoutes = require("./routes/user.routes");
const uploadRoutes = require("./routes/upload.routes");


const app = express();
app.use("/hls", express.static("public/hls"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// static files (video/audio)
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// routes
app.use("/api/feed", feedRoutes);
app.use("/api/users", userRoutes);
app.use("/api/upload", uploadRoutes);

// Initialize Video Worker
require("./services/videoQueue.service");

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err.stack);
  res.status(500).json({
    success: false,
    message: "An unexpected error occurred",
    error: process.env.NODE_ENV === "development" ? err.message : undefined
  });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log("Server running on port " + port);
});



// npm i pm2
// npx pm2 start npm --name "awaz" -- start
// npx pm2 restart awaz
// npx pm2 stop awaz
// npx pm2 save
// npx pm2 startup

// add these as comment in app.js