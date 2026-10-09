(() => {
  "use strict";

  const STORAGE_KEY = "chistodoma-text-larger";
  if (document.getElementById("cd-text-controls")) return;

  const toolbar = document.createElement("div");
  toolbar.id = "cd-text-controls";
  toolbar.className = "cd-text-controls";
  toolbar.innerHTML = [
    '<button class="cd-text-button" type="button" aria-pressed="false" title="Увеличить размер текста">',
    '<span class="cd-text-symbol" aria-hidden="true">А+</span>',
    '<span class="cd-text-label">Увеличить текст</span>',
    '</button>'
  ].join("");

  document.body.appendChild(toolbar);
  const button = toolbar.querySelector("button");
  const symbol = toolbar.querySelector(".cd-text-symbol");
  const label = toolbar.querySelector(".cd-text-label");
  let isLarge = false;

  function savedPreference() {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch (_) {
      return false;
    }
  }

  function savePreference(enabled) {
    try {
      window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
    } catch (_) {
      // The control still works for this page if storage is disabled.
    }
  }

  function isTextElement(el) {
    if (!el || !el.tagName || el.closest("#cd-text-controls")) return false;
    const ignored = new Set([
      "SCRIPT", "STYLE", "NOSCRIPT", "SVG", "PATH", "G", "CANVAS",
      "IFRAME", "OBJECT", "EMBED", "TEMPLATE", "META", "LINK",
      "SOURCE", "TRACK", "BR", "HR"
    ]);
    if (ignored.has(el.tagName)) return false;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return true;
    return Boolean((el.textContent || "").trim());
  }

  function enlargeText() {
    // Read every original size before changing any element, so nested text
    // scales from its actual design size rather than inheriting a scaled size.
    const targets = Array.from(document.body.querySelectorAll("*"))
      .filter(isTextElement)
      .map(el => ({
        el,
        size: Number.parseFloat(window.getComputedStyle(el).fontSize)
      }))
      .filter(item => Number.isFinite(item.size) && item.size > 0);

    targets.forEach(({ el, size }) => {
      if (!el.hasAttribute("data-cd-font-original")) {
        el.setAttribute("data-cd-font-original", el.style.getPropertyValue("font-size"));
        el.setAttribute("data-cd-font-priority", el.style.getPropertyPriority("font-size"));
      }
      // Small text gets the strongest boost; headings grow more subtly to
      // reduce the chance of awkward wrapping in the existing layout.
      const factor = size <= 20 ? 1.16 : size <= 36 ? 1.10 : 1.05;
      el.style.setProperty("font-size", (size * factor).toFixed(2) + "px", "important");
    });
  }

  function restoreText() {
    document.querySelectorAll("[data-cd-font-original]").forEach(el => {
      const original = el.getAttribute("data-cd-font-original") || "";
      const priority = el.getAttribute("data-cd-font-priority") || "";
      if (original) {
        el.style.setProperty("font-size", original, priority);
      } else {
        el.style.removeProperty("font-size");
      }
      el.removeAttribute("data-cd-font-original");
      el.removeAttribute("data-cd-font-priority");
    });
  }

  function updateButton(enabled) {
    isLarge = enabled;
    button.setAttribute("aria-pressed", String(enabled));
    if (enabled) {
      symbol.textContent = "А−";
      label.textContent = "Обычный размер";
      button.setAttribute("aria-label", "Вернуть обычный размер текста");
      button.title = "Вернуть обычный размер текста";
    } else {
      symbol.textContent = "А+";
      label.textContent = "Увеличить текст";
      button.setAttribute("aria-label", "Увеличить размер текста");
      button.title = "Увеличить размер текста";
    }
  }

  button.addEventListener("click", () => {
    const next = !isLarge;
    if (next) enlargeText();
    else restoreText();
    updateButton(next);
    savePreference(next);
  });

  if (savedPreference()) {
    enlargeText();
    updateButton(true);
  }
})();
