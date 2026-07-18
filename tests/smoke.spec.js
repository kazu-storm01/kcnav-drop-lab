import { expect, test } from '@playwright/test';

const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

test('public app starts without seeded battle logs and can simulate one run', async ({
  page,
}) => {
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1') return route.continue();
    if (url.hostname === 'raw.githubusercontent.com')
      return route.fulfill({ contentType: 'application/json', body: '[]' });
    if (route.request().resourceType() === 'image')
      return route.fulfill({ contentType: 'image/png', body: tinyPng });
    return route.fulfill({ status: 204, body: '' });
  });

  const browserErrors = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });

  await page.goto('/outputs/kcnav-drop-lab.html');
  await expect(page).toHaveTitle('Kcnav Drop Lab');

  const app = page.frameLocator('iframe[title="Kcnav Drop Lab"]');
  await expect(app.locator('h1')).toHaveText('KCNav Drop Lab');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
  await expect(app.locator('html')).toHaveAttribute('lang', 'ja');
  await expect(app.locator('#hero-statement')).toHaveText(
    'Indianaほか3隻のどれかが90%出るまで、あと36周。',
  );
  await app.getByText('設定', { exact: true }).click();
  const soundToggle = app.locator('#sound-toggle');
  await expect(soundToggle).toHaveAttribute('aria-pressed', 'false');
  await soundToggle.click();
  await expect(soundToggle).toHaveAttribute('aria-pressed', 'true');
  await expect(soundToggle).toHaveText('音 ON');

  const themeToggle = app.locator('#theme-toggle');
  await expect(themeToggle).toHaveText('テーマ 自動');
  await themeToggle.click();
  await expect(themeToggle).toHaveText('テーマ ライト');
  await themeToggle.click();
  await expect(themeToggle).toHaveText('テーマ ダーク');
  await expect
    .poll(() =>
      app.locator('body').evaluate(() =>
        localStorage.getItem('kcnav-drop-lab-theme-v1'),
      ),
    )
    .toBe('dark');
  await expect
    .poll(() =>
      app.locator('body').evaluate(
        () => getComputedStyle(document.documentElement).colorScheme,
      ),
    )
    .toBe('dark');
  await themeToggle.click();
  await expect(themeToggle).toHaveText('テーマ 自動');

  const fastToggle = app.locator('#fast-toggle');
  await expect(fastToggle).toHaveText('演出 標準');
  await fastToggle.click();
  await expect(fastToggle).toHaveText('演出 短縮');
  await expect
    .poll(() =>
      app.locator('body').evaluate(() =>
        localStorage.getItem('kcnav-drop-lab-fast-v1'),
      ),
    )
    .toBe('on');
  await fastToggle.click();
  await expect(fastToggle).toHaveText('演出 標準');

  await app.locator('#sound-volume').evaluate((input) => {
    input.value = '80';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect
    .poll(() =>
      app.locator('body').evaluate(() =>
        localStorage.getItem('kcnav-drop-lab-volume-v1'),
      ),
    )
    .toBe('80');
  await expect
    .poll(() =>
      app.locator('body').evaluate(() =>
        localStorage.getItem('kcnav-drop-lab-sound-v1'),
      ),
    )
    .toBe('on');
  await app.getByText('設定', { exact: true }).click();

  await expect(app.locator('#results')).toBeHidden();
  await app.getByText('その他…', { exact: true }).click();
  await app.locator('#rounds').fill('0');
  await expect(app.locator('#rounds')).toHaveAttribute('aria-invalid', 'true');
  await expect(app.locator('#rounds-error')).toBeVisible();
  await expect(app.locator('#batch-run')).toBeDisabled();
  await expect(app.locator('#goal-probability-label')).toHaveText(
    '20周で目標達成',
  );
  await expect(app.locator('#goal-probability')).toHaveText('72.88%');
  await app.locator('#rounds').fill('20');
  await expect(app.locator('#rounds')).toHaveAttribute('aria-invalid', 'false');
  await expect(app.locator('#rounds-error')).toBeHidden();
  await app.getByText('その他…', { exact: true }).click();

  await app.getByText('詳しい確率', { exact: true }).click();
  await app.locator('#rounds-chips [data-rounds="50"]').click();
  await expect(app.locator('#goal-probability-label')).toHaveText(
    '50周で目標達成',
  );
  await expect(
    app.locator('#rounds-chips [data-rounds="50"]'),
  ).toHaveAttribute('aria-pressed', 'true');
  await app.locator('#rounds-chips [data-rounds="20"]').click();
  await expect(app.locator('#goal-probability-label')).toHaveText(
    '20周で目標達成',
  );

  await expect(app.locator('#rounds-half')).toHaveText('11周');
  await expect(app.locator('#rounds-ninety')).toHaveText('36周');

  await app.getByRole('button', { name: '目標を編集', exact: true }).click();
  const indianaTarget = app.locator('.target-item').filter({ hasText: 'Indiana' });
  const indianaObtained = indianaTarget.getByRole('checkbox', {
    name: 'Indianaを入手済みにする',
  });
  await indianaObtained.check();
  await expect(indianaObtained).toBeFocused();
  await expect(indianaObtained).toBeChecked();
  await expect(app.locator('#rounds-half')).toHaveText('26周');
  await indianaObtained.uncheck();
  await expect(app.locator('#rounds-half')).toHaveText('11周');
  await expect(app.locator('#expected-targets')).toHaveText(/隻$/);
  await expect(app.locator('#goal-probability')).toHaveText(/%$/);

  await app.getByText('資材コスト（任意）', { exact: true }).click();
  await app.locator('#cost-fuel').fill('100');
  await expect(app.locator('#cost-status')).toContainText('燃料 3,600');

  await app.locator('#target-add-select').selectOption('蒼龍');
  await app.getByRole('button', { name: '目標に追加' }).click();
  const souryuuItem = app.locator('.target-item').filter({ hasText: '蒼龍' });
  await expect(souryuuItem).toContainText('最優先');
  await souryuuItem
    .getByRole('button', { name: '蒼龍を目標から外す' })
    .click();

  await app.getByRole('tab', { name: '実戦記録' }).click();
  await expect(app.locator('#hero-statement')).toBeVisible();
  await expect(app.getByText('実戦記録 0件', { exact: true })).toBeVisible();
  await expect(app.getByText('記録はありません', { exact: true })).toBeVisible();
  await expect(app.locator('#log-analysis-wrap')).toBeHidden();
  await expect(app.locator('#luck-summary')).toBeHidden();

  await app.locator('[data-quick-record="Indiana"]').click();
  await expect(app.locator('[data-quick-record="Indiana"]')).toBeFocused();
  await expect(app.locator('#luck-summary')).toBeVisible();
  await expect(app.locator('#luck-summary')).toContainText('Indiana：1/1周');
  await expect(app.locator('#luck-summary')).toContainText('上位3.7%');
  await expect(app.locator('#luck-summary')).toContainText('想定の範囲内');
  await expect(app.locator('#hero-statement')).toContainText('引きは絶好調');
  await app.getByText('詳しい分析', { exact: true }).click();
  await expect(app.locator('#log-analysis-wrap')).toBeVisible();
  await expect(app.locator('#log-analysis')).toContainText('1/1');
  await expect(app.locator('#log-analysis')).toContainText('100.00%');
  await expect(app.locator('#log-analysis')).toContainText('上振れ');
  await expect(app.locator('#log-analysis')).toContainText('上位3.7%');
  await expect(app.locator('#log-analysis')).toContainText('下位97.9%');

  await expect(app.locator('[data-quick-record="Indiana"]')).toBeVisible();
  await app.locator('[data-quick-record="ドロップなし"]').click();
  await expect(app.locator('#last-log-text')).toContainText('ドロップなし');
  await expect(app.locator('#log-summary')).toContainText('実戦記録 2件');
  await expect(app.locator('#log-analysis')).toContainText('ドロップなし');
  await app.locator('#undo-log').click();
  await expect(app.locator('#log-summary')).toContainText('実戦記録 1件');

  await app.getByRole('tab', { name: 'シミュレーション' }).click();
  await app.getByRole('button', { name: '1周', exact: true }).click();
  await expect(app.getByText(/今回 1周・/)).toBeVisible();

  await app.locator('body').evaluate(() => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: ' ', bubbles: true }),
    );
  });
  await expect(app.getByText(/今回 1周・/)).toBeVisible();

  await app.locator('#drop-stage').click();
  await expect(app.getByText(/今回 2周・/)).toBeVisible();

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
      route.fulfill({ contentType: 'image/png', body: tinyPng }),
  );

  await page.goto('/outputs/kcnav-drop-lab.html');
  const app = page.frameLocator('iframe[title="Kcnav Drop Lab"]');

  await app.locator('#profile-select').selectOption('__add__');
  await expect(app.locator('#profile-select')).toHaveValue('e3-4-kou-z');
  await expect(app.locator('#tools-panel')).toHaveAttribute('open', '');
  await expect(app.locator('#import-section')).toHaveAttribute('open', '');
  await app.locator('#kcnav-text').fill('E-9-1 甲 Xマス\nダミー艦\t50.00%\t1/2\tS');
  await expect(app.locator('#import-map')).toHaveValue('E9-1');
  await expect(app.locator('#import-difficulty')).toHaveValue('甲');
  await expect(app.locator('#import-node')).toHaveValue('X');
  await app
    .getByRole('button', { name: '新しい海域として保存' })
    .click();
  await app.getByText('艦の格付け', { exact: true }).click();
  await expect(app.locator('#drop-table')).toContainText('ドロップなし・その他');
  await app.getByText('艦の格付け', { exact: true }).click();

  await app.getByText('KCNavデータを登録・更新', { exact: true }).click();
  await app.locator('#kcnav-text').fill('Atlanta\t100.00%\t1/1\tS');
  await app.getByRole('button', { name: '解析', exact: true }).click();
  await app.locator('#import-title').fill('自動画像テスト');
  await app
    .getByRole('button', { name: '新しい海域として保存' })
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
  const sawSuspense = app.locator('#drop-stage').evaluate(
    (node) =>
      new Promise((resolve) => {
        const check = () => node.classList.contains('priority-suspense');
        if (check()) return resolve(true);
        const observer = new MutationObserver(() => {
          if (check()) {
            observer.disconnect();
            resolve(true);
          }
        });
        observer.observe(node, {
          attributes: true,
          attributeFilter: ['class'],
        });
        setTimeout(() => {
          observer.disconnect();
          resolve(check());
        }, 5000);
      }),
  );
  await app.getByRole('button', { name: '1周', exact: true }).click();
  expect(await sawSuspense).toBe(true);
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

  await app.getByText('設定', { exact: true }).click();
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
