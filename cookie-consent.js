/* Consent for optional Yandex.Metrika. The choice is stored only on this site. */
(() => {
  "use strict";
  const script = document.currentScript;
  const theme = script?.dataset.cookieTheme || "sage";
  const key = "analytics-consent-v1";
  const read = () => { try { return localStorage.getItem(key); } catch { return null; } };
  const write = value => { try { localStorage.setItem(key, value); } catch {} };
  let loaded = false;
  const loadAnalytics = () => {
    if (loaded) return;
    loaded = true;
    const tag = document.createElement("script");
    tag.src = "/metrika.js?v=4";
    tag.async = true;
    document.head.appendChild(tag);
  };
  if (read() === "accepted") loadAnalytics();
  const cookieArt = '<svg class="cookie-consent__art" viewBox="0 0 88 88" fill="none" aria-hidden="true"><circle cx="44" cy="44" r="41" fill="#E9B979"/><path d="M82 30a16 16 0 0 1-21-20A41 41 0 0 0 14 67a41 41 0 0 0 68-37Z" fill="#D89A5B"/><circle cx="30" cy="25" r="5" fill="#815038"/><circle cx="52" cy="38" r="6" fill="#815038"/><circle cx="31" cy="54" r="7" fill="#815038"/><circle cx="57" cy="64" r="4" fill="#815038"/><circle cx="65" cy="21" r="3" fill="#815038"/><path d="M17 68c13 14 36 19 54 4" stroke="#A86E42" stroke-width="3" stroke-linecap="round"/></svg>';
  const panel = document.createElement("section");
  panel.className = "cookie-consent";
  panel.dataset.theme = theme;
  panel.setAttribute("role", "region");
  panel.setAttribute("aria-labelledby", "cookie-consent-title");
  panel.hidden = true;
  panel.innerHTML = '<div class="cookie-consent__illustration">' + cookieArt + '</div><div class="cookie-consent__content"><strong id="cookie-consent-title">Немного о cookie</strong><p>Мы используем Яндекс.Метрику для статистики посещений. Она устанавливает cookie и получает данные о действиях на сайте только после вашего согласия. <a href="/privacy.html">Подробнее в политике</a>.</p><div class="cookie-consent__actions"><button type="button" data-cookie-choice="accepted">Разрешить аналитику</button><button type="button" data-cookie-choice="rejected">Без аналитики</button></div></div>';
  document.body.appendChild(panel);
  const open = () => { panel.hidden = false; };
  const close = () => { panel.hidden = true; };
  panel.addEventListener("click", event => {
    const button = event.target.closest("[data-cookie-choice]");
    if (!button) return;
    const choice = button.dataset.cookieChoice;
    const previous = read();
    write(choice);
    close();
    if (choice === "accepted") loadAnalytics();
    if (choice === "rejected" && previous === "accepted") location.reload();
  });
  const settings = document.createElement("button");
  settings.type = "button";
  settings.className = "cookie-consent__settings";
  settings.textContent = "Настройки cookie";
  settings.addEventListener("click", () => { open(); panel.querySelector("[data-cookie-choice]")?.focus(); });
  const footer = document.querySelector("footer");
  (footer || document.body).appendChild(settings);
  if (read() !== "accepted" && read() !== "rejected") open();
})();