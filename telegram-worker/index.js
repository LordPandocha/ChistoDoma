const SITE_URL = "https://chistodoma86.ru/";
const VK_URL = "https://vk.ru/chisto_doma_nft";
const AVITO_URL = "https://www.avito.ru/user/a48b47d890ea3a857d486b04254535c5/profile/all/predlozheniya_uslug?id=8296352069&iid=8296352069&page_from=from_item_messenger&src=messenger&sellerId=a48b47d890ea3a857d486b04254535c5";
const PHONE_URL = "tel:+79120883029";
const ALLOWED_ORIGINS = new Set([
  "https://chistodoma86.ru",
  "https://www.chistodoma86.ru",
  "https://lordpandocha.github.io"
]);

function corsHeaders(origin = "https://chistodoma86.ru") {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://chistodoma86.ru",
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Vary": "Origin",
  };
}

function json(data, status = 200, origin = "https://chistodoma86.ru") {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(origin),
    },
  });
}

async function telegram(env, method, body) {
  const response = await fetch(
    "https://api.telegram.org/bot" + env.TELEGRAM_BOT_TOKEN + "/" + method,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
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

const keyboard = {
  inline_keyboard: [
    [
      { text: "💬 ВКонтакте", url: VK_URL },
      { text: "⭐ Авито", url: AVITO_URL },
    ],
    [
      { text: "📞 Позвонить", url: PHONE_URL },
      { text: "🌐 Сайт", url: SITE_URL },
    ],
  ],
};

async function handleTelegramUpdate(request, env) {
  const update = await request.json();

  if (update.callback_query) {
    await telegram(env, "answerCallbackQuery", {
      callback_query_id: update.callback_query.id,
      text: "Готово",
    });
    return new Response("OK");
  }

  if (!update.message) return new Response("OK");

  const message = update.message;
  const chatId = String(message.chat?.id || "");
  if (!chatId) return new Response("OK");

  await telegram(env, "setChatMenuButton", {
    chat_id: chatId,
    menu_button: {
      type: "commands",
    },
  });

  const name = message.from?.first_name || "друг";
  await sendMessage(
    env,
    chatId,
    "✨ <b>Чисто Дома</b>\n\nЗдравствуйте, " + name + "! Здесь можно посмотреть цены, написать нам или позвонить.\n\n📍 Нефтеюганск\n📞 +7 912 088-30-29",
    keyboard
  );

  return new Response("OK");
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "https://chistodoma86.ru";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return json({
        ok: true,
        configured: Boolean(env.TELEGRAM_BOT_TOKEN),
        version: "contact-only-2026-10-06",
      }, 200, origin);
    }

    if (request.method === "POST" && url.pathname === "/telegram/webhook") {
      if (!env.TELEGRAM_BOT_TOKEN) {
        return new Response("Not configured", { status: 500 });
      }
      return handleTelegramUpdate(request, env);
    }

    return json({ ok: false, error: "Not found" }, 404, origin);
  }
};
