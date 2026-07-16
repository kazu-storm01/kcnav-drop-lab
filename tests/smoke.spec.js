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

test('a KCNav preset can be edited and resolves an unbundled ship image', async ({
  page,
}) => {
  await page.route(
    'https://raw.githubusercontent.com/kcwiki/kancolle-data/master/db/ship.json',
    (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify([{ id: 597, name: 'Atlanta' }]),
      }),
  );
  await page.route(
    'https://w01y.kancolle-server.com/kcs2/resources/ship/card/0597_7129.png',
    (route) =>
      route.fulfill({
        contentType: 'image/png',
        body: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
          'base64',
        ),
      }),
  );

  await page.goto('/outputs/kcnav-drop-lab.html');
  const app = page.frameLocator('iframe[title="Kcnav Drop Lab"]');

  await app.getByText('設定・記録', { exact: true }).click();
  await app.getByText('KCNavから海域を登録', { exact: true }).click();
  await app.locator('#import-title').fill('自動画像テスト');
  await app.locator('#kcnav-text').fill('Atlanta\t100.00%\t1/1\tS');
  await app.getByRole('button', { name: '解析して確認' }).click();
  await app
    .getByRole('button', { name: '新規プリセットとして保存' })
    .click();

  await expect(app.locator('#profile-select')).toHaveValue(/profile-/);
  await expect(app.locator('#image-status')).toHaveText(
    '1/1艦の画像を表示可能',
  );

  await app.getByText('海域とバックアップ', { exact: true }).click();
  await app.locator('#edit-title').fill('Atlanta掘り');
  await app.locator('#edit-map').fill('E9-1');
  await app.locator('#edit-node').fill('X');
  await app.getByRole('button', { name: '設定を保存' }).click();
  await expect(app.locator('#profile-select')).toContainText('Atlanta掘り');

  await app.getByText('艦の格付け', { exact: true }).click();
  await app.getByLabel('Atlantaの格付け').selectOption('rare');
  await app.getByRole('button', { name: '1周', exact: true }).click();
  await expect(app.locator('#drop-content img')).toHaveAttribute(
    'src',
    /\/0597_7129\.png$/,
  );
  await expect(app.locator('#drop-stage')).toHaveClass(/reveal-rare/);
  await expect(app.locator('#drop-card')).toHaveClass(/rare reveal/);

  await app.getByLabel('Atlantaの格付け').selectOption('priority');
  await app.getByRole('button', { name: '1周', exact: true }).click();
  await expect(app.locator('#drop-stage')).toHaveClass(/priority-suspense/);
  await expect(app.locator('#drop-stage')).toHaveClass(/reveal-priority/);
  await expect(app.locator('#drop-card')).toHaveClass(/priority reveal/);

  await app.getByRole('button', { name: '10周', exact: true }).click();
  await expect(app.locator('#drop-stage')).toHaveClass(/compact-priority/, {
    timeout: 4000,
  });
  await expect(app.locator('#drop-card')).toHaveClass(/priority reveal compact/);
});

test('the factory preset can be edited and the last preset can be deleted', async ({
  page,
}) => {
  await page.goto('/outputs/kcnav-drop-lab.html');
  const app = page.frameLocator('iframe[title="Kcnav Drop Lab"]');

  await app.getByText('設定・記録', { exact: true }).click();
  await app.getByText('海域とバックアップ', { exact: true }).click();
  await app.locator('#edit-title').fill('編集した初期プリセット');
  await app.getByRole('button', { name: '設定を保存' }).click();
  await expect(app.locator('#profile-select')).toContainText(
    '編集した初期プリセット',
  );

  await app.locator('#delete-profile').click();
  await app
    .getByRole('dialog', { name: '確認' })
    .getByRole('button', { name: 'プリセットを削除', exact: true })
    .click();
  await expect(app.locator('#profile-select')).toContainText(
    '未設定プリセット',
  );
  await expect(app.getByRole('button', { name: '1周', exact: true })).toBeDisabled();
});
