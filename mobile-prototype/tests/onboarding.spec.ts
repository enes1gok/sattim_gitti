import { expect, test, type Page } from '@playwright/test';
import { explainMatch, onboardingKey } from '../src/marketplace-guidance';
import { defaults } from '../src/search-data';
import type { Listing } from '../src/marketplace-api';

test.use({ channel: 'chrome' });

const listing: Listing = { id: 'listing-1', model_id: 'model-1', make_name: 'Jeep', model_name: 'Compass', title: 'Bakımlı Jeep Compass', description: '', price: 900000, year: 2020, mileage: 68400, city: 'İstanbul', district: 'Kadıköy', fuel: 'Benzin', transmission: 'Otomatik', body: 'SUV', paint: 'unknown', replacement: 'unknown', status: 'published', created_at: '2026-11-01', photos: [] };

async function openApp(page: Page, platform: 'iPhone' | 'Android') {
  // Only simulated responses: onboarding must never create production data.
  await page.route('https://hsentdihwpkmgvavzyiq.supabase.co/**', route => {
    const request = route.request(), url = new URL(request.url());
    let rows: unknown[] = [];
    if (url.pathname.endsWith('/marketplace_listings')) {
      rows = [listing];
      if (url.searchParams.has('price') && listing.price > Number(url.searchParams.get('price')!.slice(4))) rows = [];
      for (const key of ['city', 'transmission', 'body', 'paint', 'replacement'] as const) {
        if (url.searchParams.has(key) && url.searchParams.get(key) !== `eq.${listing[key]}`) rows = [];
      }
    }
    if (url.pathname.endsWith('/vehicle_makes')) rows = [{ id: 'make-1', name: 'Jeep' }];
    if (url.pathname.endsWith('/vehicle_models')) rows = [{ id: 'model-1', name: 'Compass', body_types: ['suv'] }];
    const body = request.headers().accept?.includes('vnd.pgrst.object+json') ? rows[0] : rows;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.goto('/');
  if (platform === 'Android') {
    await page.getByRole('button', { name: /Preview device/ }).click();
    await page.getByRole('menuitemradio', { name: 'Pixel 10', exact: true }).click();
  }
}

for (const platform of ['iPhone', 'Android'] as const) {
  test(`buyer setup applies real filters, explains matches and restores preferences (${platform})`, async ({ page }) => {
    await openApp(page, platform);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('button', { name: 'Başlayalım', exact: true }).click();
    await page.getByRole('button', { name: /Araç arıyorum/ }).click();
    await page.getByRole('button', { name: "1 milyon ₺'ye kadar", exact: true }).click();
    await page.getByRole('button', { name: 'İstanbul', exact: true }).click();
    await page.getByRole('button', { name: 'Devam et', exact: true }).click();
    await page.getByRole('button', { name: 'Otomatik', exact: true }).click();
    await page.getByRole('button', { name: 'SUV', exact: true }).click();
    await page.getByRole('button', { name: 'Bana uygun ilanları göster' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('.cloud-active-filters button')).toHaveCount(4);
    const card = page.locator('.cloud-listing');
    await expect(card).toContainText('Neden sana uygun?');
    await expect(card).toContainText('100.000');
    await expect(card).toContainText('Boya bilinmiyor');
    await page.getByRole('button', { name: /Bakımlı Jeep Compass ilanını incele/ }).click();
    const reasons = page.locator('.cloud-match-detail');
    await expect(reasons).toContainText('SUV');
    await expect(reasons).not.toContainText('Boyasız');
    await page.reload();
    await expect(page.getByRole('button', { name: 'Başlayalım', exact: true })).toHaveCount(0);
    await expect(page.locator('.cloud-active-filters button')).toHaveCount(4);
    await page.getByRole('button', { name: 'Hesabım', exact: true }).click();
    await page.getByRole('button', { name: /Başlangıç tercihlerim/ }).click();
    await expect(page.getByRole('button', { name: /Araç arıyorum/ })).toBeVisible();
    await page.getByRole('button', { name: /Araç arıyorum/ }).click();
    await page.getByRole('button', { name: 'Ankara', exact: true }).click();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Konum: İstanbul filtresini kaldır', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Kuruluma devam et' }).click();
    await expect(page.getByRole('button', { name: 'Ankara', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Geri', exact: true }).click();
    await page.getByRole('button', { name: /Sadece keşfediyorum/ }).click();
    await expect(page.locator('.cloud-active-filters button')).toHaveCount(0);
  });

  test(`unfinished setup resumes without applying draft filters; skip stays skipped (${platform})`, async ({ page }) => {
    await openApp(page, platform);
    await page.getByRole('button', { name: 'Başlayalım', exact: true }).click();
    await page.getByRole('button', { name: /Araç arıyorum/ }).click();
    await page.getByRole('button', { name: 'Ankara', exact: true }).click();
    await page.reload();
    await expect(page.locator('.cloud-active-filters button')).toHaveCount(0);
    await page.getByRole('button', { name: 'Kuruluma devam et' }).click();
    await expect(page.getByRole('button', { name: 'Ankara', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Şimdilik atla', exact: true }).last().click();
    await page.reload();
    await expect(page.locator('.onboarding-welcome')).toHaveCount(0);
    await expect(page.locator('.cloud-active-filters button')).toHaveCount(0);
  });

  test(`seller setup starts the real editor and recovers unfinished vehicle details (${platform})`, async ({ page }) => {
    await openApp(page, platform);
    await page.getByRole('button', { name: 'Başlayalım', exact: true }).click();
    await page.getByRole('button', { name: /Araç satıyorum/ }).click();
    await expect(page.getByRole('heading', { name: 'Aracını seç.' })).toBeVisible();
    await page.getByRole('button', { name: 'Marka seç', exact: true }).click();
    await page.getByRole('button', { name: 'Jeep', exact: true }).click();
    await page.getByRole('button', { name: 'Model seç', exact: true }).click();
    await page.getByRole('button', { name: 'Compass', exact: true }).click();
    await page.getByLabel('Model yılı').selectOption('2020');
    await page.getByRole('button', { name: 'Devam et', exact: true }).click();
    await page.reload();
    await page.getByRole('button', { name: /İlanına kaldığın yerden devam et/ }).click();
    await expect(page.getByRole('heading', { name: 'Aracını tanımla.' })).toBeVisible();
    await page.locator('.sell-checklist summary').click();
    await page.getByRole('button', { name: /Fotoğraflar · 0\/8/ }).click();
    await page.getByRole('button', { name: 'Ön fotoğrafını ekle', exact: true }).click();
    await expect(page.locator('.photo-current-heading h3')).toHaveText('Ön');
    await expect(page.getByRole('button', { name: 'Fotoğraf çek', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'İlanı yayımla', exact: true })).toHaveCount(0);
  });

  test(`setup handles invalid storage and empty results without inventing matches (${platform})`, async ({ page }) => {
    await page.addInitScript((key) => localStorage.setItem(key, '{invalid'), onboardingKey);
    await openApp(page, platform);
    await page.getByRole('button', { name: 'Başlayalım', exact: true }).click();
    await page.getByRole('button', { name: /Araç arıyorum/ }).click();
    await page.getByRole('button', { name: 'Ankara', exact: true }).click();
    await page.getByRole('button', { name: 'Devam et', exact: true }).click();
    await page.getByRole('button', { name: 'Bana uygun ilanları göster' }).click();
    await expect(page.getByText('Henüz eşleşen ilan yok.', { exact: true })).toBeVisible();
    await expect(page.locator('.cloud-match-summary')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Bu aramayı kaydet', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Aramayı ve filtreleri temizle' }).click();
    await expect(page.locator('.cloud-listing')).toHaveCount(1);
  });
}

test('match explanations distinguish budget boundaries, unmet preferences and unknown condition', () => {
  const search = { query: '', filters: { ...defaults, budget: '1000000', location: 'ankara', transmission: 'manual', paint: 'none', replacement: 'none' } };
  const result = explainMatch(listing, search);
  expect(result.matched).toHaveLength(1);
  expect(result.missing).toHaveLength(4);
  expect(result.missing.join(' ')).toContain('bilgi bilinmiyor');
  expect(explainMatch({ ...listing, price: 1000000 }, search).matched).toContain('Tam bütçe sınırında');
  expect(explainMatch({ ...listing, price: 1100000 }, search).missing.join(' ')).toContain('üzerinde');
  expect(explainMatch({ ...listing, paint: 'none', replacement: 'none' }, search).matched).toContain('Boyasız · satıcı beyanı');
  expect(explainMatch(listing, { query: '', filters: { ...defaults } })).toEqual({ matched: [], missing: [] });
});
