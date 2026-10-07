import { test, expect } from '@playwright/test';

const pages = [
  '/',
  '/ceny.html',
  '/chistka-divanov-nefteyugansk.html',
  '/chistka-kresel-nefteyugansk.html',
  '/chistka-stulev-nefteyugansk.html',
  '/chistka-matrasov-nefteyugansk.html',
  '/chistka-mebeli-nefteyugansk.html',
  '/privacy.html',
];

test.describe('Chisto Doma cross-browser audit', () => {
  for (const path of pages) {
    test(path, async ({ page }) => {
      const badResponses = [];
      page.on('response', response => {
        if (response.status() >= 400 && response.url().startsWith('http://127.0.0.1:4173/')) {
          badResponses.push({ url: response.url(), status: response.status() });
        }
      });

      await page.goto(path, { waitUntil: 'networkidle' });
      await expect(page.locator('h1')).toHaveCount(1);

      const layout = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        scrollHeight: document.documentElement.scrollHeight,
        clientHeight: document.documentElement.clientHeight,
        scrollY: window.scrollY,
      }));

      expect(layout.scrollWidth, `horizontal overflow on ${path}`).toBeLessThanOrEqual(layout.clientWidth + 1);
      expect(layout.scrollHeight).toBeGreaterThan(layout.clientHeight);

      if (path === '/') {
        const hero = page.locator('.hero');
        await expect(hero).toBeVisible();

        const heroInfo = await hero.evaluate(el => {
          const s = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          return {
            height: r.height,
            backgroundImage: s.backgroundImage,
            overflow: s.overflow,
          };
        });

        expect(heroInfo.height).toBeGreaterThanOrEqual(Math.min(layout.clientHeight, 500));
        expect(heroInfo.backgroundImage).toContain('hero-home.webp');
      }

      const footer = page.locator('footer');
      if (await footer.count()) {
        await footer.scrollIntoViewIfNeeded();
        await page.waitForTimeout(100);
      }
      const afterScroll = await page.evaluate(() => {
        const scroller = document.scrollingElement || document.documentElement;
        return {
          scrollY: window.scrollY,
          rootScrollTop: scroller.scrollTop,
          maxScrollY: Math.max(0, scroller.scrollHeight - scroller.clientHeight),
        };
      });
      const effectiveScroll = Math.max(afterScroll.scrollY, afterScroll.rootScrollTop);
      if (afterScroll.maxScrollY > 0) {
        expect(effectiveScroll).toBeGreaterThan(0);
        expect(effectiveScroll).toBeLessThanOrEqual(afterScroll.maxScrollY + 1);
      }

      expect(badResponses, `HTTP errors on ${path}: ${JSON.stringify(badResponses)}`).toEqual([]);
    });
  }
});
