import { expect, test } from '@playwright/test';

test('public app starts without seeded battle logs and can simulate one run', async ({
  page,
}) => {
  const browserErrors = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });

  await page.goto('/outputs/kcnav-drop-lab.html');
  await expect(page).toHaveTitle('Kcnav Drop Lab');

  const app = page.frameLocator('iframe[title="Kcnav Drop Lab"]');
  await expect(
    app.getByRole('heading', { name: 'ドロップシミュレーター' }),
  ).toBeVisible();

  await app.getByText('設定・記録', { exact: true }).click();
  await app.getByText('実戦記録', { exact: true }).click();
  await expect(app.getByText('実戦記録 0件', { exact: true })).toBeVisible();
  await expect(app.getByText('記録はありません', { exact: true })).toBeVisible();

  await app.getByRole('button', { name: '1周', exact: true }).click();
  await expect(app.getByText(/今回 1周・/)).toBeVisible();

  expect(browserErrors).toEqual([]);
});
