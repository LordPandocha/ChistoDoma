const NEW_SITE_ORIGIN = "https://chistodoma86.ru";
const WWW_SITE_ORIGIN = "https://www.chistodoma86.ru";
const OLD_SITE_ORIGIN = "https://lordpandocha.github.io";
const SITE_URL = NEW_SITE_ORIGIN + "/";
const APPLICATION_URL = SITE_URL + "miniapp.html";
const ALLOWED_ORIGINS = new Set([NEW_SITE_ORIGIN, WWW_SITE_ORIGIN, OLD_SITE_ORIGIN]);

function corsHeaders(origin = NEW_SITE_ORIGIN) {
  const allowedOrigin = ALLOWED_ORIGINS.has(origin) ? origin : NEW_SITE_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Vary": "Origin",
  };
}

function json(data, status = 200, origin = NEW_SITE_ORIGIN) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(origin),
    },
  });
}

function webhookSecret(token) {
  return token.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
}

async function fetchWithTimeout(url, init, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function telegram(env, method, body) {
  const response = await fetchWithTimeout(
    "https://api.telegram.org/bot" + env.TELEGRAM_BOT_TOKEN + "/" + method,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    12000
  );
  return response.json();
}

async function sendMessage(env, chatId, text, replyMarkup) {
  return telegram(env, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

const mainKeyboard = {
  inline_keyboard: [
    [
      { text: "📸 Оставить заявку", url: APPLICATION_URL },
      { text: "💰 Цены", callback_data: "prices" },
    ],
    [
      { text: "🧼 Услуги", callback_data: "services" },
      { text: "📞 Связаться", callback_data: "contact" },
    ],
  ],
};

const adminLeadKeyboard = (phone) => ({
  inline_keyboard: [
    [
      { text: "✅ В работу", callback_data: "take_lead" },
      { text: "📞 Показать телефон", callback_data: "show_phone:" + phone.slice(0, 45) },
    ],
    [{ text: "🌐 Открыть сайт", url: SITE_URL }],
  ],
});

async function handleTelegramUpdate(request, env) {
  const expected = webhookSecret(env.TELEGRAM_BOT_TOKEN);
  const received = request.headers.get("X-Telegram-Bot-Api-Secret-Token") || "";
  if (expected && received !== expected) return new Response("Forbidden", { status: 403 });

  const update = await request.json();

  if (update.callback_query) {
    const q = update.callback_query;
    const chatId = String(q.message?.chat?.id || "");

    await telegram(env, "answerCallbackQuery", {
      callback_query_id: q.id,
      text: "Готово",
    });

    if (q.data === "application") {
      await sendMessage(
        env,
        chatId,
        "📸 <b>Заявка по фото</b>\n\nНажмите кнопку ниже — откроется удобная форма. Можно сразу приложить фото мебели, указать номер и комментарий.",
        {
          inline_keyboard: [[{ text: "📋 Открыть форму заявки", url: APPLICATION_URL }]],
        }
      );
    } else if (q.data === "prices") {
      await sendMessage(
        env,
        chatId,
        "💰 <b>Ориентировочные цены</b>\n\n🪑 Стул — от 400 ₽\n🛋 Кресло — от 1 400 ₽\n🛋 Диван — от 2 400 ₽\n🛋 Угловой диван — от 3 800 ₽\n🛏 Матрас — от 2 100 ₽\n\nТочную стоимость определим по фото.",
        mainKeyboard
      );
    } else if (q.data === "services") {
      await sendMessage(
        env,
        chatId,
        "🧼 <b>Чисто Дома</b>\n\n• Диваны и угловые диваны\n• Кресла и стулья\n• Матрасы\n• Удаление пятен и запахов\n• Выезд на дом по Нефтеюганску\n\n📸 Проще всего — прислать фото, и мы сориентируем по цене.",
        mainKeyboard
      );
    } else if (q.data === "contact") {
      await sendMessage(
        env,
        chatId,
        "📞 <b>Связаться с мастером</b>\n\nТелефон: <b>+7 912 088-30-29</b>\n\nМожно также оставить заявку по фото — так быстрее оценить работу.",
        {
          inline_keyboard: [
            [{ text: "📸 Оставить заявку", url: APPLICATION_URL }],
          ],
        }
      );
    } else if (q.data === "take_lead") {
      if (String(env.TELEGRAM_CHAT_ID) === chatId) {
        await telegram(env, "editMessageReplyMarkup", {
          chat_id: chatId,
          message_id: q.message.message_id,
          reply_markup: {
            inline_keyboard: [[{ text: "✅ Заявка взята в работу", callback_data: "lead_done" }]],
          },
        });
      }
    } else if (q.data === "lead_done") {
      if (String(env.TELEGRAM_CHAT_ID) === chatId) {
        await telegram(env, "answerCallbackQuery", {
          callback_query_id: q.id,
          text: "Заявка уже отмечена как взятая в работу",
          show_alert: false,
        });
      }
    } else if (q.data.startsWith("show_phone:") && String(env.TELEGRAM_CHAT_ID) === chatId) {
      const phone = q.data.slice("show_phone:".length);
      await sendMessage(env, chatId, "📞 Телефон клиента: <b>" + phone + "</b>");
    }

    return new Response("OK");
  }

  if (update.message) {
    const message = update.message;
    const chatId = String(message.chat?.id || "");
    const text = String(message.text || "").trim().toLowerCase();

    if (text.startsWith("/start") || text === "главное меню") {
      await telegram(env, "setChatMenuButton", {
        chat_id: chatId,
        menu_button: {
          type: "web_app",
          text: "📋 Заявка",
          web_app: { url: APPLICATION_URL },
        },
      });
      const name = message.from?.first_name || "друг";
      await sendMessage(
        env,
        chatId,
        "✨ <b>Чисто Дома</b>\n\nПривет, " + name + "! Здесь можно быстро узнать цену, посмотреть услуги или оставить заявку с фото.\n\n📍 Нефтеюганск\n📞 +7 912 088-30-29",
        mainKeyboard
      );
    } else if (text === "/prices" || text.includes("цен")) {
      await sendMessage(
        env,
        chatId,
        "💰 <b>Цены</b>\n\nСтул — от 400 ₽\nКресло — от 1 400 ₽\nДиван — от 2 900 ₽\nУгловой диван — от 3 800 ₽\nМатрас — от 2 400 ₽",
        mainKeyboard
      );
    } else if (text === "/services" || text.includes("услуг")) {
      await sendMessage(
        env,
        chatId,
        "🧼 <b>Услуги</b>\n\nЧистим диваны, кресла, стулья и матрасы, удаляем пятна и запахи, работаем с выездом на дом.",
        mainKeyboard
      );
    } else if (text === "/application" || text.includes("заяв")) {
      await sendMessage(
        env,
        chatId,
        "📸 <b>Оставить заявку</b>\n\nНажмите кнопку и приложите фото мебели — это самый быстрый способ получить ориентир по цене.",
        {
          inline_keyboard: [[{ text: "📋 Открыть форму", url: APPLICATION_URL }]],
        }
      );
    } else {
      await sendMessage(
        env,
        chatId,
        "Я могу помочь 😊\n\nВыберите действие в меню ниже:",
        mainKeyboard
      );
    }
  }

  return new Response("OK");
}

async function deliverLeadToTelegram(env, leadId, phone, item, comment, site, city, photo) {
  const caption = [
    "🧼 НОВАЯ ЗАЯВКА — ЧИСТО ДОМА",
    "",
    "📱 Телефон: " + phone,
    "🛋 Что чистить: " + (item || "Не указано"),
    "💬 Комментарий: " + (comment || "Нет"),
    "📍 Город: " + city,
    "🌐 Сайт: " + site
  ].join("\n");

  try {
    const tgForm = new FormData();
    tgForm.append("chat_id", env.TELEGRAM_CHAT_ID);
    tgForm.append("caption", caption);
    tgForm.append("photo", photo, photo.name || "photo.jpg");

    const tgResponse = await fetchWithTimeout(
      "https://api.telegram.org/bot" + env.TELEGRAM_BOT_TOKEN + "/sendPhoto",
      { method: "POST", body: tgForm },
      12000
    );

    const tgResult = await tgResponse.json();

    if (!tgResponse.ok || !tgResult.ok) {
      throw new Error(tgResult?.description || "Telegram API error");
    }

    await telegram(env, "editMessageReplyMarkup", {
      chat_id: env.TELEGRAM_CHAT_ID,
      message_id: tgResult.result?.message_id,
      reply_markup: adminLeadKeyboard(phone),
    });

    console.log("lead.sent", {
      leadId,
      telegramMessageId: tgResult.result?.message_id
    });
  } catch (error) {
    console.error("lead.delivery_failed", {
      leadId,
      error: String(error)
    });
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    const requestOrigin = request.headers.get("Origin") || NEW_SITE_ORIGIN;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(requestOrigin) });
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return json({
        ok: true,
        configured: Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID),
        version: "lead-fast-2026-10-05",
      }, 200, requestOrigin);
    }

    if (request.method === "POST" && url.pathname === "/telegram/webhook") {
      if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
        return new Response("Not configured", { status: 500 });
      }
      return handleTelegramUpdate(request, env);
    }

    if (request.method !== "POST" || url.pathname !== "/api/lead") {
      return json({ ok: false, error: "Not found" }, 404, requestOrigin);
    }

    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
      return json({ ok: false, error: "Telegram is not configured on the server" }, 500, requestOrigin);
    }

    const leadId =
      (globalThis.crypto && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : Date.now().toString(36));
    console.log("lead.received", { leadId, origin: requestOrigin });
    try {
      const form = await request.formData();
      const phone = String(form.get("phone") || "").trim();
      const item = String(form.get("item") || "").trim();
      const comment = String(form.get("comment") || "").trim();
      const site = String(form.get("site") || "Чисто Дома").trim();
      const city = String(form.get("city") || "Нефтеюганск").trim();
      const photo = form.get("photo");

      if (!phone) return json({ ok: false, error: "Phone is required" }, 400, requestOrigin);
      if (!(photo instanceof File)) return json({ ok: false, error: "Photo is required" }, 400, requestOrigin);
      if (photo.size > 10 * 1024 * 1024) {
        return json({ ok: false, error: "Photo is larger than 10 MB" }, 400, requestOrigin);
      }

      const delivery = deliverLeadToTelegram(
        env,
        leadId,
        phone,
        item,
        comment,
        site,
        city,
        photo
      );

      if (ctx && typeof ctx.waitUntil === "function") {
        ctx.waitUntil(delivery);
      } else {
        await delivery;
      }

      console.log("lead.queued", { leadId });
      return json({ ok: true, lead_id: leadId, queued: true }, 202, requestOrigin);
    } catch (error) {
      console.error("lead.failed", { leadId, error: String(error) });
      return json({ ok: false, error: "Internal server error" }, 500, requestOrigin);
    }
  }
};
