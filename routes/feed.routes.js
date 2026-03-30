const express = require("express");
const router = express.Router();

const upload = require("../middlewares/upload.middleware");
const feedController = require("../controllers/feed.controller");

// create post
// router.post(
//   "/post",
//   upload.single("media"),
//   feedController.createPost
// );

router.post(
  "/post",
  upload.fields([
    { name: "media", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 }
  ]),
  feedController.createPost
);

// get feed
router.get("/", feedController.getFeed);

router.get("/post/:postId", feedController.getPostById);

// like / unlike
router.post("/:postId/like", feedController.likeUnlike);

// comment
router.post("/:postId/comment", feedController.comment);

// share
router.post("/:postId/share", feedController.share);

router.put("/:postId", feedController.editPost);

// delete post
router.delete("/:postId", feedController.deletePost);

// user profile feed
//router.get("/user/:userId", feedController.userFeed);

router.get('/user/:userId', feedController.userFeed);

router.get("/:postId/getcomments", feedController.getComments);

router.get("/stream/:filename", feedController.streamVideo);

module.exports = router;