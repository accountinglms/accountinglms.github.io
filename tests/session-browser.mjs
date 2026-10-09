import { chromium, webkit } from 'playwright';

const browserName = process.env.BROWSER || 'chromium';
const engine = browserName === 'webkit' ? webkit : chromium;
const baseURL = process.env.TEST_BASE_URL || 'https://127.0.0.1:4173';
const AUTH_KEY = 'icaew-lms-auth-v2';

const user = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'session.test@example.com',
  email_confirmed_at: '2026-10-09T00:00:00Z',
  confirmed_at: '2026-10-09T00:00:00Z',
  phone: null,
  user_metadata: { display_name: 'Session Test' },
  factors: [{
    id: 'factor-1',
    factor_type: 'totp',
    status: 'verified',
    friendly_name: 'Authenticator Test',
    created_at: '2026-10-09T00:00:00Z',
    updated_at: '2026-10-09T00:00:00Z'
  }]
};

function session(token='token-aal2', refresh='refresh-aal2') {
  return {
    access_token: token,
    refresh_token: refresh,
    expires_in: 3600,
    expires_at: Math.floor(Date.now()/1000) + 3600,
    token_type: 'bearer',
    user
  };
}

function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers': 'authorization,apikey,content-type,prefer,x-upsert',
    'access-control-expose-headers': '*'
  };
}

function json(route, body, status=200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    headers: corsHeaders(),
    body: JSON.stringify(body)
  });
}

async function installSupabaseMock(context, opts={}) {
  const state = {
    logoutScopes: [],
    refreshCount: 0,
    translationCalls: 0,
    requests: [],
    failRefreshFor: new Set(opts.failRefreshFor || [])
  };

  await context.route('https://uangiwgznukuicrfnohq.supabase.co/**', async route => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    state.requests.push({ method: req.method(), path, search: url.search });
    const auth = req.headers()['authorization'] || '';
    const token = auth.replace(/^Bearer\s+/i, '');

    if (req.method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: corsHeaders(), body: '' });
    }

    if (path === '/auth/v1/token' && url.searchParams.get('grant_type') === 'password') {
      return json(route, session('token-aal1', 'refresh-aal1'));
    }

    if (path === '/auth/v1/token' && url.searchParams.get('grant_type') === 'refresh_token') {
      state.refreshCount += 1;
      let body = {};
      try { body = JSON.parse(req.postData() || '{}'); } catch {}
      const refreshToken = body.refresh_token || '';
      if (state.failRefreshFor.has(refreshToken)) {
        return json(route, { error: 'invalid_grant', error_description: 'Invalid Refresh Token: Refresh Token Not Found' }, 400);
      }
      return json(route, session('refreshed-aal2', 'refresh-rotated'));
    }

    if (path === '/auth/v1/user') {
      if (token === 'stale-token') {
        return json(route, {
          code: 403,
          error_code: 'session_not_found',
          msg: 'Session from session_id claim in JWT does not exist'
        }, 403);
      }
      return json(route, user);
    }

    if (path === '/auth/v1/factors/factor-1/challenge') {
      return json(route, { id: 'challenge-1', expires_at: Date.now() + 60000 });
    }

    if (path === '/auth/v1/factors/factor-1/verify') {
      return json(route, session('token-aal2', 'refresh-aal2'));
    }

    if (path === '/auth/v1/logout') {
      state.logoutScopes.push(url.searchParams.get('scope') || 'global');
      return route.fulfill({ status: 204, headers: corsHeaders(), body: '' });
    }

    if (path === '/rest/v1/rpc/get_my_access') {
      const aal2 = /aal2/.test(token);
      return json(route, {
        allowed: true,
        editor: true,
        role: 'owner',
        mfa_required: true,
        mfa_satisfied: aal2,
        aal: aal2 ? 'aal2' : 'aal1'
      });
    }

    if (path === '/functions/v1/icaew-translate') {
      state.translationCalls += 1;
      let body = {};
      try { body = JSON.parse(req.postData() || '{}'); } catch {}
      const target = body.target_language || 'vi';
      return json(route, {
        content_type: body.content_type || 'document',
        target_language: target,
        cached: false,
        model_name: 'mock-translator',
        segments: (body.segments || []).map(item => ({
          id: item.id,
          text: `[${target.toUpperCase()}] ${item.text}`
        }))
      });
    }

    if ((opts.withLesson || opts.withQuestion) && path === '/rest/v1/subjects') {
      return json(route, [{ id:'accounting_fundamental', title:'Accounting Fundamental', sort_order:0, is_active:true }]);
    }
    if ((opts.withLesson || opts.withQuestion) && path === '/rest/v1/chapters') {
      return json(route, [{ id:'chapter_1', subject_id:'accounting_fundamental', title:'Chapter 1', sort_order:0, is_active:true }]);
    }
    if (opts.withLesson && path === '/rest/v1/lessons') {
      return json(route, [{
        id:'lesson-1',
        chapter_id:'chapter_1',
        title:'Objectives of financial reporting',
        summary:'Understand the purpose of financial information.',
        content_markdown:'Financial reporting provides useful information to investors and other users.\n\nIt also helps assess stewardship of economic resources.',
        status:'published',
        sort_order:0,
        updated_at:'2026-10-09T00:00:00Z'
      }]);
    }

    if (opts.withQuestion && path === '/rest/v1/exercises') {
      return json(route, [{
        id:'exercise_1',
        chapter_id:'chapter_1',
        title:'Practice Questions',
        sort_order:0,
        is_active:true,
        content_mode:'database'
      }]);
    }
    if (opts.withQuestion && path === '/rest/v1/questions') {
      return json(route, [{
        id:'question-1',
        exercise_id:'exercise_1',
        sort_order:1,
        question_type:'single',
        prompt:'Which cost should be capitalised as part of a new machine?',
        options:['Direct delivery cost','Routine annual servicing'],
        correct_answer:0,
        required_selections:1,
        explanation_en:'Direct delivery is directly attributable to bringing the machine to the location necessary for use.',
        explanation_vi:'Chi phí vận chuyển trực tiếp được tính vào nguyên giá khi cần thiết để đưa máy đến địa điểm sử dụng.',
        practical_example_en:'A factory pays £60,000 for a machine and £2,000 to deliver it to the factory. The delivery is included in the machine cost.',
        practical_example_vi:'Nhà máy mua máy £60.000 và trả £2.000 vận chuyển đến nhà máy. Chi phí vận chuyển được cộng vào nguyên giá máy.',
        standard_reference:'IAS 16.17 — directly attributable costs',
        status:'published',
        metadata:{}
      }]);
    }

    if (path === '/rest/v1/subjects' ||
        path === '/rest/v1/chapters' ||
        path === '/rest/v1/exercises' ||
        path === '/rest/v1/questions' ||
        path === '/rest/v1/lessons' ||
        path === '/rest/v1/user_progress' ||
        path === '/rest/v1/user_preferences') {
      return json(route, []);
    }

    if (path === '/rest/v1/profiles') {
      if (req.method() === 'GET') {
        return json(route, [{
          id: user.id,
          display_name: 'Session Test',
          updated_at: '2026-10-09T00:00:00Z'
        }]);
      }
      return json(route, []);
    }

    if (path.startsWith('/rest/v1/')) {
      if (req.method() === 'GET') return json(route, []);
      return route.fulfill({ status: 204, body: '' });
    }

    return json(route, {});
  });

  return state;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForWorkspace(page) {
  await page.waitForFunction(() => document.querySelector('#auth-gate')?.classList.contains('hidden') === true);
  await page.waitForSelector('#cloud-account:not([hidden])');
}

async function seedSession(page, value) {
  await page.goto(baseURL + '/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: AUTH_KEY, value });
  await page.reload({ waitUntil: 'domcontentloaded' });
}

async function testLoginMfaPersistence(browser) {
  const context = await browser.newContext({
    serviceWorkers: 'block',
    ignoreHTTPSErrors: true,
    viewport: browserName === 'webkit' ? { width: 1512, height: 982 } : { width: 1366, height: 768 }
  });
  const mock = await installSupabaseMock(context);
  let page = await context.newPage();
  page.on('console', msg => console.log(`[${browserName} console] ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', error => console.log(`[${browserName} pageerror] ${error.stack || error.message}`));

  await page.goto(baseURL + '/', { waitUntil: 'domcontentloaded' });
  await page.fill('#auth-email', 'session.test@example.com');
  await page.fill('#auth-password', 'CorrectHorseBatteryStaple!');
  await page.click('#auth-login-btn');

  try {
    await page.waitForSelector('#auth-mfa-view:not([hidden])', { timeout: 7000 });
  } catch (error) {
    const diag = await page.evaluate(key => ({
      authMessage: document.querySelector('#auth-message')?.textContent || '',
      loginHidden: document.querySelector('#auth-login-view')?.hidden,
      mfaHidden: document.querySelector('#auth-mfa-view')?.hidden,
      gateHidden: document.querySelector('#auth-gate')?.classList.contains('hidden'),
      stored: localStorage.getItem(key)
    }), AUTH_KEY);
    console.log(`[${browserName} diagnostic]`, JSON.stringify(diag));
    console.log(`[${browserName} mock requests]`, JSON.stringify(mock.requests));
    throw error;
  }
  await page.fill('#auth-mfa-code', '123456');
  await page.click('#auth-mfa-submit');
  await waitForWorkspace(page);

  const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), AUTH_KEY);
  assert(stored?.access_token === 'token-aal2', 'MFA verification did not persist AAL2 session');

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  assert(!overflow, 'Desktop learner page has horizontal overflow');

  await page.close();

  page = await context.newPage();
  await page.goto(baseURL + '/', { waitUntil: 'domcontentloaded' });
  await waitForWorkspace(page);
  assert(await page.locator('#auth-mfa-view').isHidden(), 'Same browser context prompted MFA again after reopen');

  const isolated = await browser.newContext({ serviceWorkers: 'block', ignoreHTTPSErrors: true, viewport: { width: 1366, height: 768 } });
  await installSupabaseMock(isolated);
  const isolatedPage = await isolated.newPage();
  await isolatedPage.goto(baseURL + '/', { waitUntil: 'domcontentloaded' });
  assert(await isolatedPage.locator('#auth-login-view').isVisible(), 'Independent browser context unexpectedly inherited session storage');
  await isolated.close();

  assert(mock.logoutScopes.length === 0, 'Unexpected logout occurred during persistence test');
  await context.close();
}

async function testStaleRecovery(browser) {
  const context = await browser.newContext({ serviceWorkers: 'block', ignoreHTTPSErrors: true, viewport: { width: 1366, height: 768 } });
  const mock = await installSupabaseMock(context);
  const page = await context.newPage();

  await seedSession(page, session('stale-token', 'refresh-ok'));
  await waitForWorkspace(page);

  const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), AUTH_KEY);
  assert(stored?.access_token === 'refreshed-aal2', 'Stale session was not recovered with refresh token');
  assert(mock.refreshCount >= 1, 'Stale session did not attempt refresh');

  await context.close();
}

async function testStaleFailureMessage(browser) {
  const context = await browser.newContext({ serviceWorkers: 'block', ignoreHTTPSErrors: true, viewport: { width: 1366, height: 768 } });
  await installSupabaseMock(context, { failRefreshFor: ['refresh-bad'] });
  const page = await context.newPage();

  await seedSession(page, session('stale-token', 'refresh-bad'));
  await page.waitForSelector('#auth-login-view:not([hidden])');

  const msg = (await page.textContent('#auth-message')) || '';
  assert(/hết hiệu lực|đăng nhập lại/i.test(msg), 'Stale session failure did not show friendly re-login message');
  assert(!/session_id claim|refresh token not found/i.test(msg), 'Raw Supabase session error leaked to UI');

  const stored = await page.evaluate(key => localStorage.getItem(key), AUTH_KEY);
  assert(stored === null, 'Dead session remained in localStorage');

  await context.close();
}

async function testScopedLogout(browser) {
  const localContext = await browser.newContext({ serviceWorkers: 'block', ignoreHTTPSErrors: true, viewport: { width: 1366, height: 768 } });
  const localMock = await installSupabaseMock(localContext);
  const page = await localContext.newPage();

  await seedSession(page, session('token-aal2', 'refresh-aal2'));
  await waitForWorkspace(page);
  await page.click('#cloud-logout-btn');
  await page.waitForSelector('#auth-login-view:not([hidden])');
  assert(localMock.logoutScopes.at(-1) === 'local', 'Normal learner logout did not use scope=local');
  await localContext.close();

  const globalContext = await browser.newContext({ serviceWorkers: 'block', ignoreHTTPSErrors: true, viewport: { width: 1440, height: 900 } });
  const globalMock = await installSupabaseMock(globalContext);
  const account = await globalContext.newPage();

  await account.goto(baseURL + '/', { waitUntil: 'domcontentloaded' });
  await account.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: AUTH_KEY, value: session('token-aal2','refresh-aal2') });
  await account.goto(baseURL + '/account.html', { waitUntil: 'domcontentloaded' });
  await account.waitForSelector('#account-app:not(.hidden)');

  const accountOverflow = await account.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  assert(!accountOverflow, 'Desktop Account page has horizontal overflow');

  account.on('dialog', dialog => dialog.accept());
  await account.click('#logout-all');
  await account.waitForURL(/signed_out=all/);
  assert(globalMock.logoutScopes.at(-1) === 'global', 'Account global logout did not use scope=global');

  await globalContext.close();
}


async function testLightThemeQuestionStatusColors(browser) {
  const context = await browser.newContext({ serviceWorkers: 'block', ignoreHTTPSErrors: true, viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  await page.goto(baseURL + '/', { waitUntil: 'domcontentloaded' });

  const colors = await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    const host = document.createElement('div');
    host.innerHTML = `
      <button id="state-unanswered" class="nav-btn unanswered">1</button>
      <button id="state-pending" class="nav-btn answered-pending">2</button>
      <button id="state-correct" class="nav-btn correct">3</button>
      <button id="state-wrong" class="nav-btn wrong">4</button>
      <button id="state-current" class="nav-btn current">5</button>
    `;
    document.body.appendChild(host);

    const read = id => {
      const style = getComputedStyle(document.getElementById(id));
      return {
        background: style.backgroundColor,
        color: style.color,
        border: style.borderTopColor
      };
    };

    return {
      unanswered: read('state-unanswered'),
      pending: read('state-pending'),
      correct: read('state-correct'),
      wrong: read('state-wrong'),
      current: read('state-current')
    };
  });

  assert(colors.correct.background === 'rgb(46, 125, 50)', 'Light theme correct state lost green background');
  assert(colors.correct.color === 'rgb(255, 255, 255)', 'Light theme correct state lost white text');
  assert(colors.wrong.background === 'rgb(198, 40, 40)', 'Light theme wrong state lost red background');
  assert(colors.wrong.color === 'rgb(255, 255, 255)', 'Light theme wrong state lost white text');
  assert(colors.pending.background === 'rgb(216, 236, 251)', 'Light theme saved/pending state lost blue background');
  assert(colors.pending.border === 'rgb(63, 143, 197)', 'Light theme saved/pending state lost blue border');
  assert(colors.current.border === 'rgb(25, 118, 210)', 'Light theme current question lost blue focus border');
  assert(colors.unanswered.background === 'rgb(229, 235, 240)', 'Light theme unanswered state changed unexpectedly');

  await context.close();
}


async function testLessonTranslationIsOnDemand(browser) {
  const context = await browser.newContext({
    serviceWorkers: 'block',
    ignoreHTTPSErrors: true,
    viewport: browserName === 'webkit' ? { width: 1512, height: 982 } : { width: 1366, height: 768 }
  });
  const mock = await installSupabaseMock(context, { withLesson: true });
  const page = await context.newPage();

  await page.goto(baseURL + '/', { waitUntil:'domcontentloaded' });
  await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), {
    key: AUTH_KEY,
    value: session('token-aal2','refresh-aal2')
  });

  await page.goto(baseURL + '/lessons.html', { waitUntil:'domcontentloaded' });
  await page.waitForSelector('#lesson-translate-btn');

  assert(mock.translationCalls === 0, 'Lesson translation called AI before the user clicked translate');
  const originalTitle = await page.textContent('#lesson-reader-title');
  assert(originalTitle === 'Objectives of financial reporting', 'Original lesson did not render');

  await page.click('#lesson-translate-btn');
  await page.waitForFunction(() => document.querySelector('#lesson-reader-title')?.textContent?.startsWith('[VI]'));
  assert(mock.translationCalls >= 1, 'Lesson translation click did not call universal translation service');
  assert((await page.textContent('#lesson-reader-content')).startsWith('[VI]'), 'Lesson content was not translated');

  await page.click('#lesson-translate-btn');
  await page.waitForFunction(() => document.querySelector('#lesson-reader-title')?.textContent === 'Objectives of financial reporting');
  assert(mock.translationCalls >= 1, 'Returning to original should not remove prior translation evidence');

  await context.close();
}


async function testCompactQuizToolsOnPhone(browser) {
  const context = await browser.newContext({
    serviceWorkers: 'block',
    ignoreHTTPSErrors: true,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });
  const page = await context.newPage();
  await page.goto(baseURL + '/', { waitUntil:'domcontentloaded' });

  const result = await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    const quiz = document.querySelector('#quiz-container');
    const body = document.querySelector('#quiz-body');
    if (quiz) quiz.style.display = 'block';
    if (body) body.style.display = 'block';

    const bookmark = document.querySelector('#bookmark-btn');
    const translate = document.querySelector('#translate-question-btn');
    const tools = document.querySelector('.question-tools');
    bookmark?.classList.add('active');

    const b = bookmark.getBoundingClientRect();
    const t = translate.getBoundingClientRect();
    const row = tools.getBoundingClientRect();
    const bStyle = getComputedStyle(bookmark);

    return {
      bookmarkWidth: b.width,
      translateWidth: t.width,
      sameRow: Math.abs(b.top - t.top) < 2,
      rowWidth: row.width,
      viewportWidth: window.innerWidth,
      overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      activeBackground: bStyle.backgroundColor,
      bookmarkHeight: b.height,
      translateHeight: t.height
    };
  });

  assert(result.sameRow, 'Bookmark and translation controls did not stay on one mobile row');
  assert(result.bookmarkWidth < result.viewportWidth * 0.5, 'Bookmark control became a mobile full-width banner');
  assert(result.translateWidth < result.viewportWidth * 0.45, 'Translation control became a mobile full-width banner');
  assert(!result.overflow, 'Compact quiz tools caused horizontal overflow on phone');
  assert(result.activeBackground !== 'rgb(255, 179, 0)', 'Active bookmark reverted to solid yellow banner');
  assert(result.bookmarkHeight <= 48 && result.translateHeight <= 48, 'Mobile quiz tools are still too tall');

  await context.close();
}


async function testMobileTopbarDoesNotCoverQuizStats(browser) {
  for (const width of [390, 430]) {
    const context = await browser.newContext({
      serviceWorkers: 'block',
      ignoreHTTPSErrors: true,
      viewport: { width, height: 844 },
      isMobile: true,
      hasTouch: true
    });
    const page = await context.newPage();
    await page.goto(baseURL + '/', { waitUntil:'domcontentloaded' });

    const layout = await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
      const quiz = document.querySelector('#quiz-container');
      const body = document.querySelector('#quiz-body');
      if (quiz) quiz.style.display = 'block';
      if (body) body.style.display = 'block';

      const topbar = document.querySelector('#mobile-topbar');
      const main = document.querySelector('#main-area');
      const overview = document.querySelector('#session-overview');
      const title = document.querySelector('#section-title-display');

      const topbarRect = topbar.getBoundingClientRect();
      const mainStyle = getComputedStyle(main);
      const overviewRect = overview.getBoundingClientRect();

      return {
        topbarBottom: topbarRect.bottom,
        overviewTop: overviewRect.top,
        mainPaddingTop: parseFloat(mainStyle.paddingTop),
        topbarHeight: topbarRect.height,
        sectionTitleDisplay: getComputedStyle(title).display,
        overflow: document.documentElement.scrollWidth > window.innerWidth + 1
      };
    });

    assert(layout.mainPaddingTop >= layout.topbarHeight + 8,
      `Mobile main content offset is too small at ${width}px`);
    assert(layout.overviewTop >= layout.topbarBottom + 8,
      `Quiz statistics are covered by the fixed topbar at ${width}px`);
    assert(layout.sectionTitleDisplay === 'none',
      `Duplicate section title is still visible below the mobile topbar at ${width}px`);
    assert(!layout.overflow,
      `Mobile topbar fix caused horizontal overflow at ${width}px`);

    await context.close();
  }
}


async function testAuditedExplanationExamples(browser) {
  const context = await browser.newContext({
    serviceWorkers:'block',
    ignoreHTTPSErrors:true,
    viewport:{ width:390, height:844 },
    isMobile:true,
    hasTouch:true
  });
  await installSupabaseMock(context, { withQuestion:true });
  const page = await context.newPage();

  await page.goto(baseURL + '/', { waitUntil:'domcontentloaded' });
  await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), {
    key: AUTH_KEY,
    value: session('token-aal2','refresh-aal2')
  });
  await page.reload({ waitUntil:'domcontentloaded' });
  await waitForWorkspace(page);

  await page.waitForSelector('#menu-exercise_1');
  await page.click('#menu-exercise_1');
  await page.waitForSelector('#options-container .option');
  await page.click('#options-container .option:nth-child(1)');
  await page.click('#submit-btn');
  await page.waitForSelector('#explanation.show');

  const result = await page.evaluate(() => ({
    engExample: document.querySelector('#eng-example')?.textContent || '',
    viExample: document.querySelector('#vie-example')?.textContent || '',
    reference: document.querySelector('#standard-reference-text')?.textContent || '',
    engHidden: document.querySelector('#eng-example-card')?.hidden,
    viHidden: document.querySelector('#vie-example-card')?.hidden,
    overflow: document.documentElement.scrollWidth > window.innerWidth + 1
  }));

  assert(/factory pays £60,000/i.test(result.engExample), 'English practical example did not render');
  assert(/Nhà máy mua máy/i.test(result.viExample), 'Vietnamese practical example did not render');
  assert(/IAS 16\.17/.test(result.reference), 'Standard reference did not render');
  assert(result.engHidden === false && result.viHidden === false, 'Practical example cards remained hidden');
  assert(!result.overflow, 'Explanation/example UI caused horizontal overflow on phone');

  await context.close();
}

const browser = await engine.launch({ headless: true });
try {
  await testLoginMfaPersistence(browser);
  await testStaleRecovery(browser);
  await testStaleFailureMessage(browser);
  await testScopedLogout(browser);
  await testLightThemeQuestionStatusColors(browser);
  await testLessonTranslationIsOnDemand(browser);
  await testCompactQuizToolsOnPhone(browser);
  await testMobileTopbarDoesNotCoverQuizStats(browser);
  await testAuditedExplanationExamples(browser);
  console.log(`PASS ${browserName}: session + UI + explanations + universal translation suite`);
} finally {
  await browser.close();
}
