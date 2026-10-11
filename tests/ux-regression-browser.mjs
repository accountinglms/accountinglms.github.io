import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {session,installFakeWebSocket,installMock} from './helpers/portal-fixtures.mjs';
const baseURL=process.env.TEST_BASE_URL||'https://127.0.0.1:4173';
const browserName=process.env.BROWSER||'chromium';
const browser=await (browserName==='webkit'?webkit:chromium).launch({headless:true});
async function fixture(width=1280){
  const context=await browser.newContext({ignoreHTTPSErrors:true,serviceWorkers:'block',viewport:{width,height:850}});
  await installFakeWebSocket(context);const state=await installMock(context);
  await context.addInitScript(s=>localStorage.setItem('icaew-lms-auth-v2',JSON.stringify(s)),session);
  const page=await context.newPage();return {context,page,state};
}
try{
  {
    const {context,page,state}=await fixture();let failing=true;
    await context.route('**/rest/v1/chat_groups?**',route=>failing?route.abort('failed'):route.fallback());
    state.progress.unshift({exercise_id:'archived-exercise',updated_at:'2099-01-01T00:00:00Z'});
    await page.goto(baseURL+'/home.html');
    await page.waitForSelector('#subject-catalog .subject-row');
    assert.equal(await page.locator('#subject-catalog .subject-row').count(),1,'Chat failure must leave the study catalog usable');
    assert((await page.locator('#home-load-status').innerText()).includes('chưa tải'));
    assert(!(await page.locator('[data-continue-exercise]').getAttribute('href')).includes('archived-exercise'));
    failing=false;await page.locator('.retry-home').click();
    await page.waitForSelector('#home-load-status',{state:'hidden'});
    await page.fill('#feedback-subject','UX regression');await page.fill('#feedback-message','One submission only.');
    await page.locator('#feedback-form').evaluate(form=>{form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});
    await page.waitForFunction(()=>document.querySelector('#feedback-status').textContent.includes('Đã gửi'));
    assert.equal(state.mutations.feedback,1,'Rapid submit must create one feedback row');
    await context.close();
  }
  {
    const {context,page}=await fixture(390);
    await page.goto(baseURL+'/index.html');
    await page.waitForFunction(()=>document.querySelector('#auth-gate').classList.contains('hidden')&&!document.body.classList.contains('auth-pending'));
    assert(await page.locator('#sidebar').evaluate(el=>el.inert),'Closed mobile drawer must be outside the tab sequence');
    await page.locator('#mobile-menu-btn').click();
    assert(await page.locator('#main-area').evaluate(el=>el.inert));
    assert(await page.locator('#sidebar').evaluate(el=>el.contains(document.activeElement)));
    await page.locator('#sidebar-close-btn').focus();await page.keyboard.press('Shift+Tab');
    assert(await page.locator('#sidebar').evaluate(el=>el.contains(document.activeElement)),'Drawer tabs must stay inside');
    await page.keyboard.press('Escape');
    assert(await page.locator('#mobile-menu-btn').evaluate(el=>el===document.activeElement),'Escape restores the launcher');
    assert(!(await page.locator('#main-area').evaluate(el=>el.inert)));
    await page.locator('#mobile-menu-btn').click();
    const launcher=page.locator('.sidebar-learning-nav [data-calculator-launcher]');await launcher.click();
    await page.waitForSelector('#lms-calculator:not([hidden])');
    const panel=page.locator('#lms-calculator'),before=await panel.locator('.calc-expression').textContent();
    await page.locator('#mobile-menu-btn').focus();await page.keyboard.press('7');
    assert.equal(await panel.locator('.calc-expression').textContent(),before,'Calculator must not intercept shortcuts outside its panel');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#lms-calculator:not([hidden])').count(),0);
    await context.close();
  }
  {
    const {context,page}=await fixture();
    await page.goto(baseURL+'/community.html');await page.waitForSelector('.chat-group');
    await page.locator('#create-group-btn').click();
    await page.waitForSelector('#group-modal:not([hidden])');
    assert(await page.locator('#group-name').evaluate(el=>el===document.activeElement));
    await page.locator('#group-modal button[type=submit]').focus();await page.keyboard.press('Tab');
    assert(await page.locator('#group-name').evaluate(el=>el===document.activeElement),'Modal tab wrap is missing');
    await page.keyboard.press('Escape');
    assert(await page.locator('#create-group-btn').evaluate(el=>el===document.activeElement));
    await page.locator('#community-profile-open').click();
    await page.waitForFunction(()=>document.querySelector('#community-profile-dialog').contains(document.activeElement));
    const imageBase64=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=200;c.height=200;c.getContext('2d').fillRect(0,0,200,200);return c.toDataURL('image/png').split(',')[1];});
    const chooserPromise=page.waitForEvent('filechooser');
    await page.locator('#avatar-editor-trigger').click();
    const chooser=await chooserPromise;
    await chooser.setFiles({name:'nested.png',mimeType:'image/png',buffer:Buffer.from(imageBase64,'base64')});
    await page.waitForFunction(()=>document.querySelector('#avatar-edit-dialog').contains(document.activeElement));
    await page.keyboard.press('Escape');
    assert(await page.locator('#community-profile-dialog').evaluate(el=>!el.hidden),'Escape in the cropper must preserve the parent profile');
    assert(await page.locator('#avatar-editor-trigger').evaluate(el=>el===document.activeElement),'Nested dialog must restore focus within its parent');
    await page.keyboard.press('Escape');
    assert(await page.locator('#community-profile-open').evaluate(el=>el===document.activeElement));
    await context.close();
  }
  console.log('PASS '+browserName+': partial outage, retry, archived continuation, rapid submit, drawer, calculator and modal keyboard regression');
}finally{await browser.close();}
