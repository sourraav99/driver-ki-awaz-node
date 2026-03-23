const mysql = require("mysql2/promise");

const db = mysql.createPool({
  host: "localhost",
  user: "jrdumdat_development",
  password: "QihA?]ElHYc~p[iY",
  database: "jrdumdat_development",
  waitForConnections: true,
  connectionLimit: 10
});

module.exports = db;