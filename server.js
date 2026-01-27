import express from "express";
import pg from "pg"; 
import { randomUUID } from "crypto";
import path from "path";

const app = express();

const { Pool } = pg;
const db = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://localhost:5432/diary_db",
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

app.use(express.json());
app.use(express.static("public"));

const initDb = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS entries (
        id UUID PRIMARY KEY,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        mood TEXT,
        reflection TEXT
      )
    `);
    console.log("Database initialized");
  } catch (err) {
    console.error("Db init error:", err);
  }
};
initDb();

app.get("/health", (_, res) => res.send("ok"));

app.get("/entries", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM entries ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/entries", async (req, res) => {
  const { content } = req.body;
  const entry = {
    id: randomUUID(),
    content,
    created_at: new Date().toISOString()
  };

  try {
    await db.query(
      `INSERT INTO entries (id, content, created_at) VALUES ($1, $2, $3)`,
      [entry.id, entry.content, entry.created_at]
    );
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/entries/:id/reflection", async (req, res) => {
  const fakeReflection = {
    mood: "Reflective 🌱",
    text: "Today you took time to pause and reflect. That matters."
  };

  try {
    await db.query(
      `UPDATE entries SET mood=$1, reflection=$2 WHERE id=$3`,
      [fakeReflection.mood, fakeReflection.text, req.params.id]
    );
    res.json(fakeReflection);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/entries/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM entries WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint Simulasi Crash untuk Demo Phase 4
app.get("/crash", (req, res) => {
  console.log("Simulating crash...");
  process.exit(1); 
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Diary app running on :${PORT}`));