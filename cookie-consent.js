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
  const cookieArt = '<img class="cookie-consent__art" src="/cookie-illustration.webp?v=2" width="88" height="88" alt="" aria-hidden="true">';
  const panel = document.createElement("section");
  panel.className = "cookie-consent";
  panel.dataset.theme = theme;
  panel.setAttribute("role", "region");
  panel.setAttribute("aria-labelledby", "cookie-consent-title");
  panel.hidden = true;
  panel.innerHTML = '<div class="cookie-consent__illustration">' + cookieArt + '</div><div class="cookie-consent__content"><strong id="cookie-consent-title">Немного о cookie</strong><p>Мы используем Яндекс.Метрику для статистики посещений. Она устанавливает cookie и получает данные о действиях на сайте только после вашего согласия. <a href="/privacy.html">Подробнее в политике</a>.</p><div class="cookie-consent__actions"><button type="button" data-cookie-choice="accepted">Разрешить аналитику</button><button type="button" data-cookie-choice="rejected">Без аналитики</button></div></div>';
  document.body.prepend(panel);
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