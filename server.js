import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import "dotenv/config";
import express from "express";
import pg from "pg";
import { randomUUID } from "crypto";
import path from "path";

const app = express();

async function getInstanceId() {
  try {
    const tokenRes = await fetch("http://169.254.169.254/latest/api/token", {
      method: "PUT",
      headers: { "X-aws-ec2-metadata-token-ttl-seconds": "21600" }
    });
    const token = await tokenRes.text();

    const idRes = await fetch("http://169.254.169.254/latest/meta-data/instance-id", {
      headers: { "X-aws-ec2-metadata-token": token }
    });
    return await idRes.text();
  } catch (err) {
    console.error("Metadata Error:", err);
    return "Unknown-Instance";
  }
}

const { Pool } = pg;
const db = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://localhost:5432/diary_db",
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});
const bedrock = new BedrockRuntimeClient({ region: "ap-northeast-1" });

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
  try {
    const entryResult = await db.query("SELECT content FROM entries WHERE id = $1", [req.params.id]);
    if (entryResult.rows.length === 0) return res.status(404).send("Entry not found");
    const userContent = entryResult.rows[0].content;

    // Bedrockのプロンプト設定
    const systemPrompt = `Act as an empathetic AI journaling assistant. Your task is to process a diary entry and provide:

1. Mood Analysis: Identify the user's mood based on the text. Keep it at a surface-level sentiment with a matching emoji. Do not over-analyze or use clinical psychological terms.
2. Reflection & Encouragement: Provide a short, heartfelt reflection and a few words of encouragement.

Important Rule: EVERYTHING (Mood, Reflection, and Encouragement) MUST BE WRITTEN IN THE SAME LANGUAGE as the diary entry. If the diary is in Japanese, respond in Japanese. If it is in Indonesian, respond in Indonesian. If it is in English, respond in English, and so on.

CRITICAL FORMAT: Respond ONLY in this format:
[Mood] | [Reflection]`;

    const input = {
      modelId: "anthropic.claude-3-haiku-20240307-v1:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 800,
        system: systemPrompt,
        messages: [{ role: "user", content: [{ type: "text", text: userContent }] }],
        temperature: 0.7,
        top_p: 0.999,
        top_k: 250
      }),
    };

    // Invoke Bedrock
    const command = new InvokeModelCommand(input);
    const response = await bedrock.send(command);
    const resBody = JSON.parse(new TextDecoder().decode(response.body));
    const aiRawResponse = resBody.content[0].text;

    const parts = aiRawResponse.split('|');
    const moodResult = parts[0]?.trim() || "Neutral 😐";
    const reflectionResult = parts[1]?.trim() || aiRawResponse;

    // db入力#3
    await db.query(
      `UPDATE entries SET mood=$1, reflection=$2 WHERE id=$3`,
      [moodResult, reflectionResult, req.params.id]
    );

    res.json({ mood: moodResult, text: reflectionResult });
  } catch (err) {
    console.error("Bedrock Error:", err);
    res.status(500).json({ error: "AIの問題が発生しました..." });
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

// Endpoint Crash for simulation #4
app.get("/crash", (req, res) => {
  console.log("Simulating crash...");
  process.exit(1);
});

app.get('/api/instance-info', async (req, res) => {
  const id = await getInstanceId();
  res.json({ instanceId: id });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Diary app running on :${PORT}`));