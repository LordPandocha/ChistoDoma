import express from "express";
import cors from "cors";
import multer from "multer";

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "https://chistodoma86.ru,https://lordpandocha.github.io";

app.use(cors({
  origin: CORS_ORIGIN.split(",").map(s => s.trim()),
  methods: ["GET", "POST", "OPTIONS"]
}));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    botConfigured: Boolean(BOT_TOKEN),
    chatConfigured: Boolean(CHAT_ID)
  });
});

app.get("/", (_req, res) => {
  res.send("Chisto Doma Telegram API is running");
});

app.post("/api/lead", upload.single("photo"), async (req, res) => {
  try {
    if (!BOT_TOKEN || !CHAT_ID) {
      return res.status(500).json({ ok: false, error: "Telegram is not configured on the server" });
    }

    const { phone, item, comment, site, city } = req.body || {};
    if (!phone) return res.status(400).json({ ok: false, error: "Phone is required" });
    if (!req.file) return res.status(400).json({ ok: false, error: "Photo is required" });

    const text = [
      "🧼 НОВАЯ ЗАЯВКА — ЧИСТО ДОМА",
      "",
      `📱 Телефон: ${phone}`,
      `🛋 Что чистить: ${item || "Не указано"}`,
      `💬 Комментарий: ${comment || "Нет"}`,
      `📍 Город: ${city || "Нефтеюганск"}`,
      `🌐 Сайт: ${site || "Чисто Дома"}`
    ].join("\n");

    const form = new FormData();
    form.append("chat_id", CHAT_ID);
    form.append("caption", text);
    form.append("photo", new Blob([req.file.buffer], { type: req.file.mimetype }), req.file.originalname || "photo.jpg");

    const tg = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      method: "POST",
      body: form
    });

    const result = await tg.json();
    if (!tg.ok || !result.ok) {
      console.error("Telegram API error:", result);
      return res.status(502).json({ ok: false, error: "Telegram rejected the message" });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("Lead error:", err);
    res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Chisto Doma Telegram API listening on ${PORT}`);
});
