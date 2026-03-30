const db = require("../config/db");

exports.createUploadSession = async (id, userId, fileName, fileSize, totalChunks) => {
    await db.query(
        "INSERT INTO upload_sessions (uploadId, user_id, fileName, fileSize, totalChunks) VALUES (?, ?, ?, ?, ?)",
        [id, userId, fileName, fileSize, totalChunks]
    );
};

exports.updateUploadSessionStatus = async (id, status) => {
    await db.query(
        "UPDATE upload_sessions SET status = ? WHERE uploadId = ?",
        [status, id]
    );
};

exports.getUploadSession = async (id) => {
    const [rows] = await db.query(
        "SELECT * FROM upload_sessions WHERE uploadId = ?",
        [id]
    );
    return rows[0];
};
