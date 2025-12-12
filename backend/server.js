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
  db.run(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);
  db.run(`
    INSERT OR IGNORE INTO meta(key,value)
    VALUES ('resetVersion','1')
  `);
});

/* ===== Middleware ===== */
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

/* ===== API ===== */

/* 抽獎紀錄 */
app.post("/api/record", (req, res) => {
  const { name, prize, mode, device } = req.body;
  const time = new Date().toISOString();

  db.run(
    `INSERT INTO records(time,name,mode,prize,device)
     VALUES (?,?,?,?,?)`,
    [time, name, mode, prize, device],
    () => res.json({ ok: true })
  );
});

/* 查詢紀錄 */
app.get("/api/history", (req, res) => {
  db.all(
    `SELECT time,name,mode,prize,device
     FROM records
     ORDER BY time DESC`,
    (err, rows) => res.json(rows || [])
  );
});

/* 清除紀錄（同步前端端末限制） */
app.post("/api/reset", (req, res) => {
  db.serialize(() => {
    db.run("DELETE FROM records");
    db.run(
      `UPDATE meta
       SET value = CAST(value AS INTEGER) + 1
       WHERE key='resetVersion'`
    );
    res.json({ ok: true });
  });
});

/* reset version */
app.get("/api/reset-version", (req, res) => {
  db.get(
    `SELECT value FROM meta WHERE key='resetVersion'`,
    (err, row) => {
      res.json({ version: row ? row.value : "1" });
    }
  );
});

/* ===== 前端入口 ===== */
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

/* ===== Start ===== */
app.listen(PORT, () => {
  console.log("http://localhost:" + PORT);
});
