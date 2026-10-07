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
        const heroImage = hero.locator('.hero-bg');
        await expect(heroImage).toHaveAttribute('src', 'hero-home.webp?v=20261007');
        await expect.poll(async () => heroImage.evaluate(img => ({ complete: img.complete, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight }))).toMatchObject({ complete: true });
        await expect.poll(async () => heroImage.evaluate(img => ({
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight
        }))).toMatchObject({
          naturalWidth: expect.any(Number),
          naturalHeight: expect.any(Number)
        });
        expect((await heroImage.evaluate(img => img.naturalWidth))).toBeGreaterThan(1000);

        const heroInfo = await hero.evaluate(el => {
          const image = el.querySelector('.hero-bg');
          const cs = image ? getComputedStyle(image) : null;
          const r = el.getBoundingClientRect();
          return {
            height: r.height,
            imagePresent: !!image,
            imageComplete: !!image?.complete,
            naturalWidth: image?.naturalWidth || 0,
            naturalHeight: image?.naturalHeight || 0,
            position: cs?.position || '',
            objectFit: cs?.objectFit || '',
            zIndex: cs?.zIndex || '',
          };
        });

        expect(heroInfo.height).toBeGreaterThanOrEqual(Math.min(layout.clientHeight, 500));
        expect(heroInfo.imagePresent).toBe(true);
        expect(heroInfo.imageComplete).toBe(true);
        expect(heroInfo.naturalWidth).toBeGreaterThan(0);
        expect(heroInfo.naturalHeight).toBeGreaterThan(0);
        expect(heroInfo.position).toBe('absolute');
        expect(heroInfo.objectFit).toBe('cover');
      }

      const scrollMetrics = await page.evaluate(() => {
        const scroller = document.scrollingElement || document.documentElement;
        return {
          scrollHeight: scroller.scrollHeight,
          clientHeight: scroller.clientHeight,
          bodyOverflowX: getComputedStyle(document.body).overflowX,
          htmlOverflowX: getComputedStyle(document.documentElement).overflowX,
        };
      });
      expect(scrollMetrics.scrollHeight).toBeGreaterThanOrEqual(scrollMetrics.clientHeight);
      expect(['visible','clip','hidden']).toContain(scrollMetrics.bodyOverflowX);
      expect(['visible','clip','hidden']).toContain(scrollMetrics.htmlOverflowX);

      expect(badResponses, `HTTP errors on ${path}: ${JSON.stringify(badResponses)}`).toEqual([]);
    });
  }
});
