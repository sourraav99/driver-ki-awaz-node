const db = require("../config/db");

exports.createUploadSession = async (id, userId, fileName, fileSize, totalChunks) => {
    await db.query(
        "INSERT INTO upload_sessions (id, user_id, fileName, fileSize, totalChunks) VALUES (?, ?, ?, ?, ?)",
        [id, userId, fileName, fileSize, totalChunks]
    );
};

exports.updateUploadSessionStatus = async (id, status) => {
    await db.query(
        "UPDATE upload_sessions SET status = ? WHERE id = ?",
        [status, id]
    );
};

exports.getUploadSession = async (id) => {
    const [rows] = await db.query(
        "SELECT * FROM upload_sessions WHERE id = ?",
        [id]
    );
    return rows[0];
};
