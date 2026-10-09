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

  assert(await calc.locator('.calc-control-deck').isVisible(), 'FX-style control deck is missing');
  assert(await calc.locator('.calc-nav-pad').isVisible(), 'FX-style navigation pad is missing');
  assert((await calc.locator('.calc-number-pad .calc-white-key').count()) === 24, 'FX-style 6-column number pad is incomplete');
  assert((await calc.locator('.calc-mode-key .calc-shift-label').textContent()) === 'SETUP', 'DEG key lost its secondary label structure');
  assert((await calc.locator('.calc-modes .calc-mode-tab:not(.calc-mode-internal)').count()) === 12, 'Official 12-mode MENU is incomplete');

  const navBox = await calc.locator('.calc-nav-pad').boundingBox();
  const okBox = await calc.locator('.calc-nav-ok').boundingBox();
  const upBox = await calc.locator('.calc-nav-up').boundingBox();
  const downBox = await calc.locator('.calc-nav-down').boundingBox();
  const leftBox = await calc.locator('.calc-nav-left').boundingBox();
  const rightBox = await calc.locator('.calc-nav-right').boundingBox();
  assert(navBox && okBox && upBox && downBox && leftBox && rightBox, 'Navigation geometry is not measurable');
  const navCx = navBox.x + navBox.width / 2;
  const navCy = navBox.y + navBox.height / 2;
  const okCx = okBox.x + okBox.width / 2;
  const okCy = okBox.y + okBox.height / 2;
  assert(Math.abs(navCx - okCx) <= 1.5 && Math.abs(navCy - okCy) <= 1.5, `OK key is not centered: Δx=${Math.abs(navCx-okCx)} Δy=${Math.abs(navCy-okCy)}`);
  assert(Math.abs((upBox.x + upBox.width/2) - navCx) <= 1.5, 'Up arrow is not horizontally centered');
  assert(Math.abs((downBox.x + downBox.width/2) - navCx) <= 1.5, 'Down arrow is not horizontally centered');
  assert(Math.abs((leftBox.y + leftBox.height/2) - navCy) <= 1.5, 'Left arrow is not vertically centered');
  assert(Math.abs((rightBox.y + rightBox.height/2) - navCy) <= 1.5, 'Right arrow is not vertically centered');

  const faceGeometry = await calc.evaluate(() => {
    const boxes = selector => Array.from(document.querySelectorAll('#lms-calculator ' + selector)).map(el => {
      const r = el.getBoundingClientRect();
      return {x:r.x,y:r.y,width:r.width,height:r.height,cx:r.x+r.width/2,cy:r.y+r.height/2};
    });
    const labelPairs = Array.from(document.querySelectorAll('#lms-calculator .calc-sci-key')).map(key => {
      const k = key.getBoundingClientRect();
      const main = key.querySelector('b')?.getBoundingClientRect();
      const shift = key.querySelector('.calc-shift-label')?.getBoundingClientRect();
      return {
        keyCx:k.x+k.width/2,
        mainCx:main ? main.x+main.width/2 : null,
        shiftCx:shift ? shift.x+shift.width/2 : null
      };
    });
    return {
      top: boxes('.calc-top-key'),
      sci: boxes('.calc-sci-key'),
      numeric: boxes('.calc-white-key'),
      labelPairs
    };
  });

  const assertUniformRows = (boxes, perRow, label) => {
    for (let i=0;i<boxes.length;i+=perRow) {
      const row=boxes.slice(i,i+perRow);
      const cy=row.map(b=>b.cy);
      const heights=row.map(b=>b.height);
      assert(Math.max(...cy)-Math.min(...cy)<=1.5, `${label} row ${i/perRow+1} is vertically uneven`);
      assert(Math.max(...heights)-Math.min(...heights)<=1.5, `${label} row ${i/perRow+1} has inconsistent key heights`);
    }
  };
  assertUniformRows(faceGeometry.sci,6,'Science');
  assertUniformRows(faceGeometry.numeric,6,'Number');
  const topHeights=faceGeometry.top.map(b=>b.height);
  assert(Math.max(...topHeights)-Math.min(...topHeights)<=1.5,'SHIFT/ALPHA/MENU/ON key heights are inconsistent');

  for (const [index,pair] of faceGeometry.labelPairs.entries()) {
    assert(pair.mainCx != null && Math.abs(pair.keyCx-pair.mainCx)<=1.5, `Science key ${index+1} main label is not centered`);
    assert(pair.shiftCx != null && Math.abs(pair.keyCx-pair.shiftCx)<=1.5, `Science key ${index+1} SHIFT label is not centered`);
  }

  await action('clear');
  await action('shift');
  await fn('sin');
  await pressInsert('0');
  await pressInsert('.');
  await pressInsert('5');
  await pressInsert(')');
  await action('equals');
  assert((await calc.locator('.calc-result').textContent()) === '30', 'SHIFT inverse trig failed');

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

  const switchMode = async name => {
    const menu = calc.locator('.calc-modes');
    if (!(await menu.isVisible())) await action('menu');
    await calc.locator(`[data-mode="${name}"]`).click();
    await calc.locator(`[data-mode-panel="${name}"].active`).waitFor();
  };

  // Polynomial equation: x² - 5x + 6 = 0 => 2, 3
  await switchMode('equation');
  const eqInputs = calc.locator('#calc-equation-inputs input');
  await eqInputs.nth(0).fill('1');
  await eqInputs.nth(1).fill('-5');
  await eqInputs.nth(2).fill('6');
  await calc.locator('#calc-equation-solve').click();
  const eqText = await calc.locator('#calc-equation-output').innerText();
  assert(eqText.includes('2') && eqText.includes('3'), `Equation solver failed: ${eqText}`);

  // Linear system: 2x + y = 5; x - y = 1 => x=2, y=1
  await switchMode('equation');
  await calc.locator('[data-open-system]').click();
  await calc.locator('[data-mode-panel="system"].active').waitFor();
  const sysCoeff = calc.locator('#calc-system-grid input[data-col]');
  const sysConst = calc.locator('#calc-system-grid input[data-constant]');
  await sysCoeff.nth(0).fill('2');
  await sysCoeff.nth(1).fill('1');
  await sysCoeff.nth(2).fill('1');
  await sysCoeff.nth(3).fill('-1');
  await sysConst.nth(0).fill('5');
  await sysConst.nth(1).fill('1');
  await calc.locator('#calc-system-solve').click();
  const sysText = await calc.locator('#calc-system-output').innerText();
  assert(/x\s*2/.test(sysText) && /y\s*1/.test(sysText), `System solver failed: ${sysText}`);

  // One-variable statistics
  await switchMode('statistics');
  await calc.locator('#calc-stat-x').fill('1, 2, 3, 4');
  await calc.locator('#calc-stat-solve').click();
  const statText = await calc.locator('#calc-stat-output').innerText();
  assert(statText.includes('2.5') && statText.includes('10'), `Statistics failed: ${statText}`);

  // Matrix A × I = A
  await switchMode('matrix');
  const matA = calc.locator('#calc-matrix-a input');
  for (const [index,value] of ['1','2','3','4'].entries()) await matA.nth(index).fill(value);
  await calc.locator('[data-matrix-op="multiply"]').click();
  const matrixValues = await calc.locator('#calc-matrix-output .calc-matrix-result span').allTextContents();
  assert(matrixValues.join(',') === '1,2,3,4', `Matrix multiplication failed: ${matrixValues.join(',')}`);

  // Vector cross product in 3D
  await switchMode('vector');
  await calc.locator('#calc-vector-size').selectOption('3');
  const vecA = calc.locator('#calc-vector-a input');
  const vecB = calc.locator('#calc-vector-b input');
  for (const [index,value] of ['1','0','0'].entries()) await vecA.nth(index).fill(value);
  for (const [index,value] of ['0','1','0'].entries()) await vecB.nth(index).fill(value);
  await calc.locator('[data-vector-op="cross"]').click();
  const vectorText = await calc.locator('#calc-vector-output').innerText();
  assert(vectorText.includes('[0, 0, 1]'), `Vector cross product failed: ${vectorText}`);

  // Complex: (1+i)(1-i)=2
  await switchMode('complex');
  await calc.locator('[data-complex-op="mul"]').click();
  const complexText=await calc.locator('#calc-complex-output').innerText();
  assert(complexText.includes('2'), `Complex mode failed: ${complexText}`);

  // Base-N: decimal 10 => HEX A, and 10 AND 12 => 8
  await switchMode('basen');
  await calc.locator('#calc-base-run').click();
  let baseText=await calc.locator('#calc-base-output').innerText();
  assert(/HEX\s*A/.test(baseText), `Base-N conversion failed: ${baseText}`);
  await calc.locator('#calc-base-op').selectOption('and');
  await calc.locator('#calc-base-run').click();
  baseText=await calc.locator('#calc-base-output').innerText();
  assert(/DEC\s*8/.test(baseText), `Base-N logical AND failed: ${baseText}`);

  // Distribution: Normal PD x=0 sigma=1 mu=0 ~= 0.39894228
  await switchMode('distribution');
  await calc.locator('#calc-dist-run').click();
  const distText=await calc.locator('#calc-dist-output').innerText();
  assert(distText.includes('0.398942'), `Distribution mode failed: ${distText}`);

  // Table: x^2 from 1 to 3
  await switchMode('table');
  await calc.locator('#calc-table-end').fill('3');
  await calc.locator('#calc-table-run').click();
  const tableText=await calc.locator('#calc-table-output').innerText();
  assert(tableText.includes('9') && tableText.includes('3'), `Table mode failed: ${tableText}`);

  // Inequality: x^2 - 1 >= 0 => (-inf,-1] U [1,inf)
  await switchMode('inequality');
  const ineqInputs=calc.locator('#calc-ineq-inputs input');
  await ineqInputs.nth(0).fill('1');
  await ineqInputs.nth(1).fill('0');
  await ineqInputs.nth(2).fill('-1');
  await calc.locator('#calc-ineq-run').click();
  const ineqText=await calc.locator('#calc-ineq-output').innerText();
  assert(ineqText.includes('-1') && ineqText.includes('1'), `Inequality mode failed: ${ineqText}`);

  // Verify: sin(30)=0.5 in DEG
  await switchMode('verify');
  await calc.locator('#calc-verify-run').click();
  const verifyText=await calc.locator('#calc-verify-output').innerText();
  assert(verifyText.includes('TRUE'), `Verify mode failed: ${verifyText}`);

  // Ratio: 2:3 = 4:X => X=6
  await switchMode('ratio');
  await calc.locator('#calc-ratio-run').click();
  const ratioText=await calc.locator('#calc-ratio-output').innerText();
  assert(/X\s*6/.test(ratioText), `Ratio mode failed: ${ratioText}`);

  // Extended Calculate: CALC variables, SOLVE, numerical derivative, memory/display
  await switchMode('calculate');
  await calc.locator('[data-pro-drawer="calc"]').click();
  await calc.locator('#calc-calc-run').click();
  const calcVarText=await calc.locator('#calc-calc-output').innerText();
  assert(calcVarText.includes('7'), `CALC variable evaluation failed: ${calcVarText}`);

  await calc.locator('[data-pro-drawer="solve"]').click();
  await calc.locator('#calc-solve-run').click();
  const solveText=await calc.locator('#calc-solve-output').innerText();
  assert(solveText.includes('1.4142'), `SOLVE failed: ${solveText}`);

  await calc.locator('[data-pro-drawer="optn"]').click();
  await calc.locator('#calc-calculus-type').selectOption('derivative');
  await calc.locator('#calc-calculus-a').fill('3');
  await calc.locator('#calc-calculus-run').click();
  const derivativeText=await calc.locator('#calc-calculus-output').innerText();
  assert(derivativeText.includes('6'), `Numerical derivative failed: ${derivativeText}`);

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

  console.log(`PASS ${browserName}: full 12-mode fx-580VN X calculator suite`);
  await context.close();
} finally {
  await browser.close();
}
