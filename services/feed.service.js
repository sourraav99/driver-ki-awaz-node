const db = require("../config/db");

exports.createPost = async (userId, media_type, media_url, caption, category, thumbnail) => {
  await db.query(
    "INSERT INTO posts (user_id, media_type, media_url, caption, category, thumbnail, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [userId, media_type, media_url, caption, category, thumbnail, 1]
  );
};

// const FEED_LIMIT = 5;

// exports.getFeed = async (userId, cursor, lastId) => {
//   let condition = "WHERE p.status = 1";
//   let params = [userId];

//   if (cursor && lastId) {
//     condition += `
//       AND (p.created_at < ? OR (p.created_at = ? AND p.id < ?))
//     `;
//     params.push(cursor, cursor, lastId);
//   }

//   const [rows] = await db.query(
//     `
//     SELECT 
//       p.*,
//       u.name AS user_name,
//       u.images AS user_avatar,
//       EXISTS (
//         SELECT 1 FROM post_likes pl
//         WHERE pl.post_id = p.id AND pl.user_id = ?
//       ) AS is_liked
//     FROM posts p
//     JOIN users u ON u.id = p.user_id
//     ${condition}
//     ORDER BY p.created_at DESC, p.id DESC
//     LIMIT ${FEED_LIMIT}
//     `,
//     params
//   );

//   return rows;
// };

const FEED_LIMIT = 5;

// exports.getFeed = async (userId, cursor, lastId) => {
//   let condition = "WHERE p.status = 1";
//   let params = [userId];

//   if (cursor && lastId) {
//     condition += `
//       AND (p.created_at < ? OR (p.created_at = ? AND p.id < ?))
//     `;
//     params.push(cursor, cursor, lastId);
//   }

//   params.push(FEED_LIMIT);

//   const [rows] = await db.query(
//     `
//     SELECT 
//       p.id,
//       p.user_id,
//       p.media_type,

//       /* ðŸ”¥ VIDEO â†’ STREAM URL */
//       CASE
//         WHEN p.media_type = 'video'
//         THEN CONCAT('/api/feed/stream/', SUBSTRING_INDEX(p.media_url, '/', -1))
//         ELSE p.media_url
//       END AS media_url,

//       p.caption,
//       p.likes_count,
//       p.comments_count,
//       p.shares_count,
//       p.category,
//       p.status,
//       p.created_at,
//       p.updated_at,

//       u.name AS user_name,
//       u.images AS user_avatar,

//       EXISTS (
//         SELECT 1
//         FROM post_likes pl
//         WHERE pl.post_id = p.id
//           AND pl.user_id = ?
//       ) AS is_liked

//     FROM posts p
//     JOIN users u ON u.id = p.user_id
//     ${condition}
//     ORDER BY p.created_at DESC, p.id DESC
//     LIMIT ?
//     `,
//     params
//   );

//   return rows;
// };

// exports.getFeed = async (userId, cursor, lastId) => {
//   let condition = "WHERE p.status = 1";
//   let params = [userId];

//   if (cursor && lastId) {
//     condition += `
//       AND (p.created_at < ? OR (p.created_at = ? AND p.id < ?))
//     `;
//     params.push(cursor, cursor, lastId);
//   }

//   const [rows] = await db.query(
//     `
//     SELECT 
//       p.*,
//       SUBSTRING_INDEX(p.media_url, '/', -1) AS video_file,  -- 👈 yaha filename
//       u.name AS user_name,
//       u.images AS user_avatar,
//       EXISTS (
//         SELECT 1 FROM post_likes pl
//         WHERE pl.post_id = p.id AND pl.user_id = ?
//       ) AS is_liked
//     FROM posts p
//     JOIN users u ON u.id = p.user_id
//     ${condition}
//     ORDER BY p.created_at DESC, p.id DESC
//     LIMIT ${FEED_LIMIT}
//     `,
//     params
//   );

//   return rows;
// };

exports.getFeed = async (userId, cursor, lastId, type) => {

  let condition = "WHERE p.status = 1";
  let params = [userId];

  // type filter (only if type is not empty)
  if (type && type.trim() !== "") {
    const types = type.split(",");
    condition += ` AND p.media_type IN (${types.map(() => "?").join(",")})`;
    params.push(...types);
  }

  // cursor pagination
  if (cursor && lastId) {
    condition += `
      AND (p.created_at < ? OR (p.created_at = ? AND p.id < ?))
    `;
    params.push(cursor, cursor, lastId);
  }

  const [rows] = await db.query(
    `
    SELECT 
      p.*,
      SUBSTRING_INDEX(p.media_url, '/', -1) AS video_file,
      u.name AS user_name,
      u.images AS user_avatar,
      EXISTS (
        SELECT 1 FROM post_likes pl
        WHERE pl.post_id = p.id AND pl.user_id = ?
      ) AS is_liked
    FROM posts p
    JOIN users u ON u.id = p.user_id
    ${condition}
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT ${FEED_LIMIT}
    `,
    params
  );

  return rows;
};

exports.getPostById = async (userId, postId) => {

  const [rows] = await db.query(
    `
    SELECT 
      p.*,
      SUBSTRING_INDEX(p.media_url, '/', -1) AS video_file,
      u.name AS user_name,
      u.images AS user_avatar,
      EXISTS (
        SELECT 1 FROM post_likes pl
        WHERE pl.post_id = p.id AND pl.user_id = ?
      ) AS is_liked
    FROM posts p
    JOIN users u ON u.id = p.user_id
    WHERE p.id = ? AND p.status = 1
    LIMIT 1
    `,
    [userId, postId]
  );

  return rows[0] || null;
};


exports.likeUnlike = async (userId, postId) => {
  const [like] = await db.query(
    "SELECT id FROM post_likes WHERE post_id=? AND user_id=?",
    [postId, userId]
  );

  if (like.length) {
    await db.query("DELETE FROM post_likes WHERE id=?", [like[0].id]);
    await db.query("UPDATE posts SET likes_count = likes_count - 1 WHERE id=?", [postId]);
    return { liked: false };
  }

  await db.query(
    "INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)",
    [postId, userId]
  );
  await db.query("UPDATE posts SET likes_count = likes_count + 1 WHERE id=?", [postId]);

  return { liked: true };
};

exports.comment = async (userId, postId, comment) => {
  await db.query(
    "INSERT INTO post_comments (post_id, user_id, comment) VALUES (?, ?, ?)",
    [postId, userId, comment]
  );
  await db.query(
    "UPDATE posts SET comments_count = comments_count + 1 WHERE id=?",
    [postId]
  );
};

exports.share = async (userId, postId) => {
  await db.query(
    "INSERT INTO post_shares (post_id, user_id) VALUES (?, ?)",
    [postId, userId]
  );
  await db.query(
    "UPDATE posts SET shares_count = shares_count + 1 WHERE id=?",
    [postId]
  );
};


// exports.editPost = async (userId, postId, caption) => {
//   await db.query(
//     "UPDATE posts SET caption=? WHERE id=? AND user_id=?",
//     [caption, postId, userId]
//   );
// };


exports.editPost = async (
  userId,
  postId,
  caption,
  media_type,
  media_url
) => {
  let fields = [];
  let params = [];

  if (caption !== undefined) {
    fields.push("caption = ?");
    params.push(caption);
  }

  if (media_url) {
    fields.push("media_type = ?");
    fields.push("media_url = ?");
    params.push(media_type, media_url);
  }

  if (!fields.length) return false;

  params.push(postId, userId);

  const [result] = await db.query(
    `
    UPDATE posts
    SET ${fields.join(", ")}
    WHERE id = ? AND user_id = ?
    `,
    params
  );

  return result.affectedRows > 0;
};

exports.deletePost = async (userId, postId) => {
  await db.query(
    "DELETE FROM posts WHERE id=? AND user_id=?",
    [postId, userId]
  );
};


exports.userFeed = async (viewerId, userId, cursor, lastId) => {
  let condition = "";
  let params = [viewerId, userId];

  if (cursor && lastId) {
    condition = `
      AND (p.created_at < ? OR (p.created_at = ? AND p.id < ?))
    `;
    params.push(cursor, cursor, lastId);
  }

  const [rows] = await db.query(
    `
    SELECT p.*,
      EXISTS (
        SELECT 1 FROM post_likes pl
        WHERE pl.post_id = p.id AND pl.user_id = ?
      ) AS is_liked
    FROM posts p
    WHERE p.user_id = ?
    ${condition}
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT 10
    `,
    params
  );

  return rows;
};


exports.getComments = async (userId, postId, cursor, lastId) => {
  let condition = "";
  let params = [userId, postId];

  if (cursor && lastId) {
    condition = `
      AND (c.created_at < ? OR (c.created_at = ? AND c.id < ?))
    `;
    params.push(cursor, cursor, lastId);
  }

  const [rows] = await db.query(
    `
    SELECT 
      c.id,
      c.comment,
      c.created_at,
      c.user_id,
      u.name,
      u.images,
      IF(c.user_id = ?, true, false) AS can_edit
    FROM post_comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.post_id = ?
    ${condition}
    ORDER BY c.created_at DESC, c.id DESC
    LIMIT 20
    `,
    params
  );

  return rows;
};
