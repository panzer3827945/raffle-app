const express = require("express");
const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = process.env.PORT || 3000;

/* =========================================================
 * Middleware
 * ========================================================= */
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

/* =========================================================
 * SQLite（Railway /tmp 穩定寫入）
 * ========================================================= */
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

  db.run(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  db.run(`
    INSERT OR IGNORE INTO meta (key, value)
    VALUES ('resetVersion', ?)
  `, [String(Date.now())]);
});

/* =========================================================
 * resetVersion helpers
 * ========================================================= */
function getResetVersion(callback) {
  db.get(
    `SELECT value FROM meta WHERE key='resetVersion'`,
    (err, row) => {
      if (err) return callback(null);
      callback(row ? row.value : null);
    }
  );
}

function updateResetVersion(callback) {
  const newVersion = String(Date.now());
  db.run(
    `UPDATE meta SET value=? WHERE key='resetVersion'`,
    [newVersion],
    err => {
      if (err) return callback(null);
      callback(newVersion);
    }
  );
}

/* =========================================================
 * API
 * ========================================================= */

/* 新增抽獎紀錄 */
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

/* 查詢所有抽獎紀錄 */
app.post("/api/history", (req, res) => {
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

/* 清空抽獎紀錄（同步 resetVersion） */
app.post("/api/reset", (req, res) => {
  db.run("DELETE FROM records", err => {
    if (err) {
      console.error("DELETE error:", err);
      return res.status(500).json({ ok: false });
    }

    updateResetVersion(newVersion => {
      if (!newVersion) {
        return res.status(500).json({ ok: false });
      }
      res.json({
        ok: true,
        resetVersion: newVersion
      });
    });
  });
});

/* 取得目前 resetVersion */
app.get("/api/reset-version", (req, res) => {
  getResetVersion(version => {
    res.json({
      resetVersion: version
    });
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
  console.log("SERVER VERSION = RAFFLE-FINAL-NO-PASSWORD-RESETVERSION");
});
