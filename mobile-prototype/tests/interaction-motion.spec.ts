import { expect, test, type Page } from '@playwright/test';

test.use({ channel: 'chrome' });

async function openApp(page: Page, platform: 'iPhone' | 'Android') {
    // UI-only checks: never send test searches or account actions to production.
    await page.route('https://hsentdihwpkmgvavzyiq.supabase.co/**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    await page.goto('/');
    if (platform === 'Android') {
      await page.getByRole('button', { name: /Preview device/ }).click();
      await page.getByRole('menuitemradio', { name: 'Pixel 10', exact: true }).click();
    }
}

for (const platform of ['iPhone', 'Android'] as const) {
  test(`navigation keeps the search and accepts the first tap with a keyboard (${platform})`, async ({ page }) => {
    await openApp(page, platform);
    const nav = page.getByRole('navigation', { name: 'Ana gezinme' });
    const query = page.getByRole('textbox', { name: 'Marka, model veya kelime ara' });
    await query.fill('Compass');
    await nav.getByRole('button', { name: 'Kaydedilenler' }).click();
    await expect(page.getByText('Kaydettiklerin hep yanında.')).toBeVisible();
    await nav.getByRole('button', { name: 'Hesabım' }).click();
    await expect(page.getByRole('heading', { name: 'Hesabım', exact: true })).toBeVisible();
    await nav.getByRole('button', { name: 'Keşfet' }).click();
    await expect(query).toHaveValue('Compass');
    await expect(nav.locator('[aria-current="page"]')).toHaveText('Keşfet');
    await expect(page.locator('.nav-selection')).toHaveCount(1);
    await expect(page.locator('.cloud-content')).toHaveCSS('opacity', '1');
  });

  test(`reduced motion covers content, press feedback and portalled panels (${platform})`, async ({ page }) => {
    await openApp(page, platform);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByRole('button', { name: 'Filtreler', exact: true }).click();
    const filters = page.locator('.market-filters');
    await expect(filters).toBeVisible();
    await expect(filters).toHaveCSS('animation-name', 'none');
    await expect(filters).toHaveCSS('transform', 'none');
    const option = page.getByRole('button', { name: "1 milyon ₺'ye kadar", exact: true });
    await expect(option).toHaveCSS('transition-duration', '0s');
    await option.click();
    await page.getByRole('button', { name: 'Sonuçları göster', exact: true }).click();
    await expect(page.getByRole('button', { name: /Bütçe: 1 milyon.*filtresini kaldır/ })).toBeVisible();
    await expect(page.locator('.cloud-content')).toHaveCSS('animation-name', 'none');
    await expect(page.getByTestId('bottom-sheet')).toHaveCount(0);
  });
}
