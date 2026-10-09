import { chromium, webkit } from 'playwright';

const browserName = process.env.BROWSER || 'chromium';
const engine = browserName === 'webkit' ? webkit : chromium;
const baseURL = process.env.TEST_BASE_URL || 'https://127.0.0.1:4173';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const browser = await engine.launch({ headless: true });

try {
  const context = await browser.newContext({
    serviceWorkers: 'block',
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();
  await page.goto(baseURL + '/', { waitUntil: 'domcontentloaded' });

  await page.waitForSelector('[data-calculator-launcher]', { state: 'attached' });
  await page.evaluate(() => document.querySelector('[data-calculator-launcher]')?.click());
  await page.waitForSelector('#lms-calculator:not([hidden])');

  const calc = page.locator('#lms-calculator');
  const pressInsert = value => calc.locator(`[data-insert="${value}"]`).first().click({ force: true });
  const action = value => calc.locator(`[data-action="${value}"]`).click({ force: true });
  const fn = value => calc.locator(`[data-fn="${value}"]`).click({ force: true });

  await pressInsert('2');
  await pressInsert('+');
  await pressInsert('3');
  await action('equals');
  assert((await calc.locator('.calc-result').textContent()) === '5', 'Basic calculator arithmetic failed');

  await action('clear');
  await fn('sin');
  await pressInsert('3');
  await pressInsert('0');
  await pressInsert(')');
  await action('equals');
  assert((await calc.locator('.calc-result').textContent()) === '0.5', 'DEG trigonometry failed');

  await action('clear');
  await pressInsert('1');
  await pressInsert('/');
  await pressInsert('3');
  await action('equals');
  await action('fraction');
  assert((await calc.locator('.calc-result').textContent()) === '1/3', 'S⇔D fraction conversion failed');

  const before = await calc.boundingBox();
  const handle = calc.locator('[data-calc-drag]');
  const handleBox = await handle.boundingBox();
  assert(before && handleBox, 'Calculator drag handle is not measurable');

  await page.mouse.move(handleBox.x + 90, handleBox.y + 20);
  await page.mouse.down();
  await page.mouse.move(handleBox.x + 10, handleBox.y + 120, { steps: 8 });
  await page.mouse.up();

  const after = await calc.boundingBox();
  assert(after && (Math.abs(after.x - before.x) > 20 || Math.abs(after.y - before.y) > 20), 'Calculator window did not move');

  await calc.locator('.calc-close').click({ force: true });
  assert(await calc.getAttribute('hidden') !== null, 'Calculator close button did not hide the panel');

  console.log(`PASS ${browserName}: integrated draggable scientific calculator`);
  await context.close();
} finally {
  await browser.close();
}
