const ALLOWED_ORIGIN = "https://lordpandocha.github.io";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(),
    },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, configured: Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) });
    }

    if (request.method !== "POST" || url.pathname !== "/api/lead") {
      return json({ ok: false, error: "Not found" }, 404);
    }

    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
      return json({ ok: false, error: "Telegram secrets are not configured" }, 500);
    }

    try {
      const form = await request.formData();
      const phone = String(form.get("phone") || "").trim();
      const item = String(form.get("item") || "").trim();
      const comment = String(form.get("comment") || "").trim();
      const site = String(form.get("site") || "Чисто Дома").trim();
      const city = String(form.get("city") || "Нефтеюганск").trim();
      const photo = form.get("photo");

      if (!phone) return json({ ok: false, error: "Phone is required" }, 400);
      if (!(photo instanceof File)) return json({ ok: false, error: "Photo is required" }, 400);
      if (photo.size > 10 * 1024 * 1024) {
        return json({ ok: false, error: "Photo is larger than 10 MB" }, 400);
      }

      const caption = [
        "🧼 НОВАЯ ЗАЯВКА — ЧИСТО ДОМА",
        "",
        "📱 Телефон: " + phone,
        "🛋 Что чистить: " + (item || "Не указано"),
        "💬 Комментарий: " + (comment || "Нет"),
        "📍 Город: " + city,
        "🌐 Сайт: " + site
      ].join("\n");

      const tgForm = new FormData();
      tgForm.append("chat_id", env.TELEGRAM_CHAT_ID);
      tgForm.append("caption", caption);
      tgForm.append("photo", photo, photo.name || "photo.jpg");

      const tgResponse = await fetch(
        "https://api.telegram.org/bot" + env.TELEGRAM_BOT_TOKEN + "/sendPhoto",
        { method: "POST", body: tgForm }
      );

      const tgResult = await tgResponse.json();

      if (!tgResponse.ok || !tgResult.ok) {
        console.error("Telegram API error", tgResult);
        return json({ ok: false, error: "Telegram API error", telegram_error: tgResult?.description || "Unknown Telegram error" }, 502);
      }

      return json({ ok: true });
    } catch (error) {
      console.error("Lead error", error);
      return json({ ok: false, error: "Internal server error" }, 500);
    }
  }
};
