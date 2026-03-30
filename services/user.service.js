const db = require("../config/db");

exports.getUserDashboard = async (viewerId, userId) => {
  // user basic info
  const [[user]] = await db.query(
    "SELECT id, name, images FROM users WHERE id=?",
    [userId]
  );

  // user posts
  const [posts] = await db.query(
    `
    SELECT p.*,
      EXISTS (
        SELECT 1 FROM post_likes pl
        WHERE pl.post_id = p.id AND pl.user_id = ?
      ) AS is_liked
    FROM posts p
    WHERE p.user_id=?
    AND (p.processing_status IS NULL OR p.processing_status != 'failed')
    ORDER BY p.created_at DESC
    `,
    [viewerId, userId]
  );

  // user comments
  const [comments] = await db.query(
    `
    SELECT c.id, c.comment, c.created_at,
           p.id AS post_id, p.media_url
    FROM post_comments c
    JOIN posts p ON p.id = c.post_id
    WHERE c.user_id=?
    ORDER BY c.created_at DESC
    `,
    [userId]
  );

  return {
    user,
    posts,
    comments,
    can_edit: viewerId == userId
  };
};
