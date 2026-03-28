const feedService = require("../services/feed.service");
const { convertToHLS } = require("../utils/ffmpeg");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
// exports.createPost = async (req, res) => {
//   try {
//     const userId = req.headers["x-user-id"];
//     const { caption, media_type, category } = req.body;

//     if (!userId || !req.file) {
//       return res.status(400).json({ message: "user_id & media required" });
//     }

//     const media_url = `/uploads/${media_type}/${req.file.filename}`;

//     await feedService.createPost(userId, media_type, media_url, caption, category);

//     res.json({ success: true, message: "Post uploaded" });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.createPost = async (req, res) => {
//   try {
//     const userId = req.headers["x-user-id"];
//     const { caption, media_type, category } = req.body;

//     if (!userId) {
//       return res.status(400).json({ message: "user_id required" });
//     }

//     let media_url = null;
//     let final_media_type = "text"; // ðŸ‘ˆ DEFAULT

//     if (req.file) {
//       final_media_type = media_type; // image | video | audio
//       media_url = `/uploads/${media_type}/${req.file.filename}`;
//     }

//     if (req.file && media_type === "video") {

//       const inputVideo = path.join(
//         __dirname,
//         "../public/uploads/video",
//         req.file.filename
//       );

//       const videoName = req.file.filename.split(".")[0];

//       const outputFolder = path.join(
//         __dirname,
//         "../public/hls",
//         videoName
//       );

//       convertToHLS(inputVideo, outputFolder);

//       media_url = `/hls/${videoName}/index.m3u8`;
//     }

//     if (!caption && !media_url) {
//       return res.status(400).json({
//         message: "Either text (caption) or media is required"
//       });
//     }

//     await feedService.createPost(
//       userId,
//       final_media_type,
//       media_url,
//       caption,
//       category
//     );

//     res.json({ success: true, message: "Post uploaded" });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };


// 16-03-26

exports.createPost = async (req, res) => {
  try {

    const userId = req.headers["x-user-id"];
    const { caption, media_type, category } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "user_id required" });
    }

    let media_url = null;
    let thumbnail = null;
    let final_media_type = "text";

    const mediaFile = req.files?.media?.[0];
    const thumbnailFile = req.files?.thumbnail?.[0];

    if (mediaFile) {
      final_media_type = media_type;
      media_url = `/uploads/${media_type}/${mediaFile.filename}`;
    }

    // VIDEO PROCESS
    if (mediaFile && media_type === "video") {

      const videoName = mediaFile.filename.split(".")[0];

      const inputVideo = path.join(
        __dirname,
        "../public/uploads/video",
        mediaFile.filename
      );

      const outputFolder = path.join(
        __dirname,
        "../public/hls",
        videoName
      );

      convertToHLS(inputVideo, outputFolder);

      media_url = `/hls/${videoName}/index.m3u8`;

      // 🔹 Thumbnail generate if not uploaded
      if (!thumbnailFile) {

        const thumbnailFolder = path.join(
          __dirname,
          "../public/uploads/thumbnails"
        );

        const thumbnailName = `${videoName}.jpg`;

        await new Promise((resolve, reject) => {
          ffmpeg(inputVideo)
            .screenshots({
              timestamps: ["2"],
              filename: thumbnailName,
              folder: thumbnailFolder,
              size: "320x240"
            })
            .on("end", resolve)
            .on("error", reject);
        });

        thumbnail = `/uploads/thumbnails/${thumbnailName}`;
      }
    }

    // If thumbnail uploaded manually
    if (thumbnailFile) {
      thumbnail = `/uploads/thumbnails/${thumbnailFile.filename}`;
    }

    if (!caption && !media_url) {
      return res.status(400).json({
        message: "Either text (caption) or media is required"
      });
    }

    await feedService.createPost(
      userId,
      final_media_type,
      media_url,
      caption,
      category,
      thumbnail
    );

    res.json({
      success: true,
      message: "Post uploaded"
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// exports.getFeed = async (req, res) => {
//   const userId = req.headers["x-user-id"] || 0;
//   const { cursor, id } = req.query;

//   const feed = await feedService.getFeed(userId, cursor, id);
//   res.json(feed);
// };

// exports.getFeed = async (req, res) => {
//   const userId = req.headers["x-user-id"] || 0;
//   const { cursor, id } = req.query;

//   const feed = await feedService.getFeed(userId, cursor, id);

//   let nextCursor = null;
//   let nextId = null;

//   if (feed.length) {
//     const lastPost = feed[feed.length - 1];
//     nextCursor = lastPost.created_at;
//     nextId = lastPost.id;
//   }

//   res.json({
//     data: feed,
//     nextCursor,
//     nextId,
//     hasMore: feed.length === 5
//   });
// };

exports.getPostById = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"] || 0;
    const { postId } = req.params;

    if (!postId) {
      return res.status(400).json({
        success: false,
        message: "Post ID is required"
      });
    }

    const post = await feedService.getPostById(userId, postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found"
      });
    }

    res.json({
      success: true,
      data: post
    });

  } catch (error) {
    console.error("GET POST ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching post",
      error: error.message
    });
  }
};


exports.getFeed = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"] || 0;
    const { cursor, id, type } = req.query; // type added

    const feed = await feedService.getFeed(userId, cursor, id, type);

    let nextCursor = null;
    let nextId = null;

    if (feed.length) {
      const lastPost = feed[feed.length - 1];
      nextCursor = lastPost.created_at;
      nextId = lastPost.id;
    }

    res.json({
      data: feed,
      nextCursor,
      nextId,
      hasMore: feed.length === 5
    });
  } catch (error) {
    console.error("GET FEED ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching feed",
      error: error.message
    });
  }
};

exports.likeUnlike = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    const { postId } = req.params;

    const result = await feedService.likeUnlike(userId, postId);
    res.json(result);
  } catch (error) {
    console.error("LIKE/UNLIKE ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.comment = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    const { comment } = req.body;
    const { postId } = req.params;

    await feedService.comment(userId, postId, comment);
    res.json({ message: "Comment added" });
  } catch (error) {
    console.error("COMMENT ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.share = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    const { postId } = req.params;

    await feedService.share(userId, postId);
    res.json({ message: "Post shared" });
  } catch (error) {
    console.error("SHARE ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


// exports.editPost = async (req, res) => {
//   const userId = req.headers["x-user-id"];
//   const { postId } = req.params;
//   const { caption } = req.body;

//   await feedService.editPost(userId, postId, caption);
//   res.json({ message: "Post updated" });
// };

exports.editPost = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    const { postId } = req.params;
    const { caption, media_type } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "user_id required" });
    }

    let media_url = null;
    let final_media_type = null;

    // agar naya media upload hua hai
    if (req.file) {
      final_media_type = media_type; // video / audio
      media_url = `/uploads/${media_type}/${req.file.filename}`;
    }

    // kam se kam caption ya media hona chahiye
    if (!caption && !media_url) {
      return res.status(400).json({
        message: "Either caption or media is required"
      });
    }

    const updated = await feedService.editPost(
      userId,
      postId,
      caption,
      final_media_type,
      media_url
    );

    if (!updated) {
      return res.status(403).json({ message: "Not allowed or post not found" });
    }

    res.json({ success: true, message: "Post updated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.deletePost = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    const { postId } = req.params;

    await feedService.deletePost(userId, postId);
    res.json({ message: "Post deleted" });
  } catch (error) {
    console.error("DELETE POST ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/*
exports.userFeed = async (req, res) => {
  const viewerId = req.headers["x-user-id"] || 0;
  const { userId } = req.params;
  const { cursor, id } = req.query;

  const feed = await feedService.userFeed(
    viewerId,
    userId,
    cursor,
    id
  );

  res.json(feed);
};
*/

// new chnages as per saurabh
exports.userFeed = async (req, res) => {
  try {
    const { userId } = req.params;
    const { media_type } = req.query;

    console.log("Requested media_type:", media_type);

    // fetch all feed
    let feed = await feedService.userFeed(userId);
    console.log("Total posts fetched:", feed.length);

    if (media_type === "video") {
      // only videos
      feed = feed.filter(item => item.media_type === "video");
      console.log("Filtered video posts:", feed.length);
    } else {
      // all non-video posts
      feed = feed.filter(item => item.media_type !== "video");
      console.log("Filtered image/text posts:", feed.length);
    }

    res.json(feed);
  } catch (error) {
    console.error("USER FEED ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};



exports.getComments = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"] || 0;
    const { postId } = req.params;
    const { cursor, id } = req.query;

    const comments = await feedService.getComments(userId, postId, cursor, id);
    res.json(comments);
  } catch (error) {
    console.error("GET COMMENTS ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


/* =========================
   VIDEO STREAMING (NO BUFFER)
========================= */
exports.streamVideo = (req, res) => {
  try {
    const fileName = req.params.filename;
    const videoPath = path.join(
      __dirname,
      "../public/uploads/video",
      fileName
    );

    if (!fs.existsSync(videoPath)) {
      return res.status(404).send("Video not found");
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    // ðŸ”¥ FIRST REQUEST (no range)
    if (!range) {
      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": "video/mp4",
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600"
      });
      fs.createReadStream(videoPath).pipe(res);
      return;
    }

    // ðŸ”¥ RANGE REQUEST
    const chunkSize = 512 * 1024; // 512KB (mobile friendly)
    const start = Number(range.replace(/\D/g, ""));
    const end = Math.min(start + chunkSize, fileSize - 1);

    const stream = fs.createReadStream(videoPath, { start, end });

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": end - start + 1,
      "Content-Type": "video/mp4",
      "Cache-Control": "public, max-age=3600"
    });

    stream.pipe(res);
  } catch (err) {
    console.error("VIDEO STREAM ERROR:", err);
    res.status(500).send("Video streaming error");
  }
};
