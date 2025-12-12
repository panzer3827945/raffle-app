const express = require("express");
const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = process.env.PORT || 3000;

/* ===== 資料目錄（Railway OK）===== */
const DATA_DIR = path.join(__dirname, "../data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const dbPath = path.join(DATA_DIR, "raffle.db");

/* ===== DB ===== */
const db = new sqlite3.Database(dbPath);
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      time TEXT,
      name TEXT,
      mode TEXT,
      prize INTEGER,
      device TEXT
    )
  `);
});

/* ===== Middleware ===== */
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

/* ===== 密碼檢查 ===== */
function checkPassword(req, res) {
  const pwd = req.body?.password;
  if (!process.env.ADMIN_PASSWORD) {
    return res.status(500).json({ message: "ADMIN_PASSWORD not set" });
  }
  if (pwd !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ message: "password error" });
    return false;
  }
  return true;
}

/* ===== API ===== */

/* 新增抽獎紀錄（不驗密碼） */
app.post("/api/record", (req, res) => {
  const { name, prize, mode, device } = req.body;
  const time = new Date().toISOString();

  db.run(
    `INSERT INTO records(time,name,mode,prize,device)
     VALUES (?,?,?,?,?)`,
    [time, name, mode, prize, device],
    err => {
      if (err) return res.status(500).json({ ok: false });
      res.json({ ok: true });
    }
  );
});

/* 查詢紀錄（需密碼） */
app.post("/api/history", (req, res) => {
  if (!checkPassword(req, res)) return;

  db.all(
    `SELECT time,name,mode,prize,device
     FROM records
     ORDER BY time DESC`,
    (err, rows) => {
      res.json(rows || []);
    }
  );
});

/* 清除紀錄（需密碼） */
app.post("/api/reset", (req, res) => {
  if (!checkPassword(req, res)) return;

  db.run("DELETE FROM records", err => {
    if (err) return res.status(500).json({ ok: false });
    res.json({ ok: true });
  });
});

/* ===== 前端入口 ===== */
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

/* ===== Start ===== */
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
