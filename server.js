const express = require("express");
const crypto = require("crypto");
const axios = require("axios");
const Anthropic = require("@anthropic-ai/sdk");

const app = express();
//require('dotenv').config();

// ===== CONFIG =====
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const PORT = process.env.PORT || 3000;



// ===== Anthropic Client =====
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// ===== Middleware: verify LINE signature =====
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

function verifyLineSignature(req) {
  const signature = req.headers["x-line-signature"];
  if (!signature) return false;
  const hmac = crypto.createHmac("sha256", LINE_CHANNEL_SECRET);
  hmac.update(req.rawBody);
  const digest = hmac.digest("base64");
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

// ===== Call Claude API =====
async function askClaude(userMessage) {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system:
      "คุณคือผู้ช่วย AI ที่ตอบสนองผ่าน LINE Messaging ตอบเป็นภาษาไทยเสมอ กระชับ ชัดเจน และเป็นมิตร",
    messages: [{ role: "user", content: userMessage }],
  });
  return response.content[0].text;
}

// ===== Reply to LINE =====
async function replyToLine(replyToken, text) {
  await axios.post(
    "https://api.line.me/v2/bot/message/reply",
    {
      replyToken,
      messages: [{ type: "text", text }],
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
    }
  );
}

// ===== Webhook endpoint =====
app.post("/webhook", async (req, res) => {
  // Verify signature
  if (!verifyLineSignature(req)) {
    console.warn("Invalid LINE signature");
    return res.status(401).json({ error: "Invalid signature" });
  }

  // Respond 200 immediately (LINE requires quick response)
  res.status(200).json({ status: "ok" });

  const events = req.body.events || [];

  for (const event of events) {
    // Handle only text messages
    if (event.type !== "message" || event.message.type !== "text") continue;

    const userText = event.message.text;
    const replyToken = event.replyToken;

    console.log(`[${new Date().toISOString()}] User: ${userText}`);

    try {
      const claudeReply = await askClaude(userText);
      console.log(`[${new Date().toISOString()}] Claude: ${claudeReply}`);
      await replyToLine(replyToken, claudeReply);
    } catch (err) {
      console.error("Error:", err.message);
      // Best-effort error reply
      try {
        await replyToLine(
          replyToken,
          "ขออภัย เกิดข้อผิดพลาดบางอย่าง กรุณาลองใหม่อีกครั้งนะคะ 🙏"
        );
      } catch (_) {}
    }
  }
});

// ===== Health check =====
app.get("/", (req, res) => {
  res.json({ status: "LINE x Claude Webhook is running 🚀" });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  //console.log(`📌 Webhook URL: http://YOUR_DOMAIN/webhook`);
  console.log("SECRET:", process.env.LINE_CHANNEL_SECRET ? "✅ found" : "❌ undefined");
console.log("TOKEN:", process.env.LINE_CHANNEL_ACCESS_TOKEN ? "✅ found" : "❌ undefined");
console.log("ANTHROPIC:", process.env.ANTHROPIC_API_KEY ? "✅ found" : "❌ undefined");
});
