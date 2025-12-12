const express = require("express");
const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = process.env.PORT || 3000;

/* =========================================================
 * Middleware（一定要最前面）
 * ========================================================= */
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

/* =========================================================
 * SQLite 資料目錄（Railway 穩定寫入）
 * =========================================================
 * Railway / 雲端環境不保證專案目錄可寫
 * /tmp 在 Railway 一定可寫
 */
const DATA_DIR = "/tmp";

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const dbPath = path.join(DATA_DIR, "raffle.db");

/* =========================================================
 * DB 初始化
 * ========================================================= */
const db = new sqlite3.Database(dbPath, err => {
  if (err) {
    console.error("DB open error:", err);
  } else {
    console.log("DB opened:", dbPath);
  }
});

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

/* =========================================================
 * 密碼驗證（防呆・不會 500）
 * ========================================================= */
function checkPassword(req, res) {
  try {
    if (!process.env.ADMIN_PASSWORD) {
      res.status(500).json({ message: "ADMIN_PASSWORD not set" });
      return false;
    }

    if (!req.body || typeof req.body.password !== "string") {
      res.status(400).json({ message: "password missing" });
      return false;
    }

    if (req.body.password !== process.env.ADMIN_PASSWORD) {
      res.status(401).json({ message: "password error" });
      return false;
    }

    return true;
  } catch (e) {
    console.error("checkPassword exception:", e);
    res.status(500).json({ message: "server error" });
    return false;
  }
}

/* =========================================================
 * API
 * ========================================================= */

/* 新增抽獎紀錄（不需要密碼） */
app.post("/api/record", (req, res) => {
  const { name, prize, mode, device } = req.body || {};
  const time = new Date().toISOString();

  db.run(
    `INSERT INTO records(time,name,mode,prize,device)
     VALUES (?,?,?,?,?)`,
    [time, name, mode, prize, device],
    err => {
      if (err) {
        console.error("INSERT error:", err);
        return res.status(500).json({ ok: false });
      }
      res.json({ ok: true });
    }
  );
});

/* 查詢抽獎紀錄（需密碼） */
app.post("/api/history", (req, res) => {
  console.log("HISTORY request body =", req.body);

  if (!checkPassword(req, res)) return;

  db.all(
    `SELECT time,name,mode,prize,device
     FROM records
     ORDER BY time DESC`,
    (err, rows) => {
      if (err) {
        console.error("SELECT error:", err);
        return res.status(500).json({ message: "db error" });
      }
      res.json(rows || []);
    }
  );
});

/* 清空抽獎紀錄（需密碼） */
app.post("/api/reset", (req, res) => {
  console.log("RESET request body =", req.body);

  if (!checkPassword(req, res)) return;

  db.run("DELETE FROM records", err => {
    if (err) {
      console.error("DELETE error:", err);
      return res.status(500).json({ ok: false });
    }
    res.json({ ok: true });
  });
});

/* =========================================================
 * 前端入口
 * ========================================================= */
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

/* =========================================================
 * Start
 * ========================================================= */
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
  console.log("ADMIN_PASSWORD =", process.env.ADMIN_PASSWORD);
  console.log("SERVER VERSION = RAFFLE-FINAL-STABLE");
});
