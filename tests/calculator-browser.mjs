import { chromium, webkit } from 'playwright';

const browserName = process.env.BROWSER || 'chromium';
const engine = browserName === 'webkit' ? webkit : chromium;
const baseURL = process.env.TEST_BASE_URL || 'https://127.0.0.1:4173';
const AUTH_KEY = 'icaew-lms-auth-v2';

const user = {
  id:'11111111-1111-4111-8111-111111111111',
  email:'calculator.test@example.com',
  email_confirmed_at:'2026-10-09T00:00:00Z',
  confirmed_at:'2026-10-09T00:00:00Z',
  user_metadata:{display_name:'Calculator Test'},
  factors:[]
};

const session = {
  access_token:'token-aal2',
  refresh_token:'refresh-aal2',
  expires_at:Math.floor(Date.now()/1000)+3600,
  token_type:'bearer',
  user
};

function cors(){
  return {
    'access-control-allow-origin':'*',
    'access-control-allow-methods':'GET,POST,PATCH,PUT,DELETE,OPTIONS',
    'access-control-allow-headers':'authorization,apikey,content-type,prefer',
    'access-control-expose-headers':'*'
  };
}

function json(route,body,status=200){
  return route.fulfill({status,contentType:'application/json',headers:cors(),body:JSON.stringify(body)});
}

async function installMock(context){
  await context.route('https://uangiwgznukuicrfnohq.supabase.co/**', async route => {
    const req=route.request();
    const url=new URL(req.url());
    const path=url.pathname;

    if(req.method()==='OPTIONS') return route.fulfill({status:204,headers:cors(),body:''});
    if(path==='/auth/v1/user') return json(route,user);
    if(path==='/rest/v1/rpc/get_my_access') {
      return json(route,{allowed:true,editor:true,role:'owner',mfa_required:false,mfa_satisfied:true,aal:'aal2'});
    }
    if(path.startsWith('/rest/v1/')){
      if(req.method()==='GET') return json(route,[]);
      return route.fulfill({status:204,headers:cors(),body:''});
    }
    return json(route,{});
  });
}

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
  await installMock(context);
  const page = await context.newPage();
  await page.addInitScript(({key,value}) => localStorage.setItem(key,JSON.stringify(value)), {key:AUTH_KEY,value:session});
  await page.goto(baseURL + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#auth-gate')?.classList.contains('hidden') === true);

  const launcher = page.locator('.sidebar-tools [data-calculator-launcher]');
  await launcher.waitFor({ state:'visible' });
  await launcher.click();
  await page.waitForSelector('#lms-calculator:not([hidden])');

  const calc = page.locator('#lms-calculator');
  const pressInsert = value => calc.locator(`[data-insert="${value}"]`).first().click({ force: true });
  const action = value => calc.locator(`[data-action="${value}"]`).click({ force: true });
  const fn = value => calc.locator(`[data-fn="${value}"]`).click({ force: true });

  await pressInsert('2');
  await pressInsert('+');
  await pressInsert('3');
  await action('equals');
  await page.waitForTimeout(30);
  const arithmeticExpression = await calc.locator('.calc-expression').textContent();
  const arithmeticResult = await calc.locator('.calc-result').textContent();
  assert(arithmeticResult === '5', `Basic calculator arithmetic failed: expression=${arithmeticExpression} result=${arithmeticResult}`);

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
