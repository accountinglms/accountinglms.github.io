import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  BASELINE_GEMINI_MODEL, FREE_VISION_MODEL_CANDIDATES,
  resolveGeminiModel, freeTierSafeToolConfig, evaluateFreePilot, chooseQualifiedFreeModel
} from '../supabase/functions/_shared/gemini-free-tier-policy.js';

// No credentials, no Supabase queries, and NO requests to Google's API.
// This is a *compatibility* pilot, not an AI accuracy benchmark.
assert.equal(resolveGeminiModel('gemini-3.8-flash'),'gemini-3.8-flash');
assert.equal(resolveGeminiModel('gemini-3.6-flash'),'gemini-3.6-flash');
assert.equal(resolveGeminiModel('gemini-2.5-flash'),'gemini-2.5-flash');
assert.equal(resolveGeminiModel('gemini-3.1-pro-preview'),BASELINE_GEMINI_MODEL);
assert.equal(resolveGeminiModel('some-new-model'),BASELINE_GEMINI_MODEL);
assert.equal(resolveGeminiModel(''),BASELINE_GEMINI_MODEL);
assert.equal(new Set(FREE_VISION_MODEL_CANDIDATES).size,FREE_VISION_MODEL_CANDIDATES.length);
for (const candidate of FREE_VISION_MODEL_CANDIDATES)
  assert.deepEqual(freeTierSafeToolConfig(candidate),{},'Potentially billable tool attached: '+candidate);
const syntheticPassingReport = {
  model:'gemini-3.8-flash',wasActuallyInvoked:true,billingDisabledVerified:true,
  chargedUsd:0,supportsImage:true,supportsPdf:true,validStructuredOutput:true,
  sourceAccuracy:1,numericAccuracy:1,falseVerifiedCount:0,baselineAccuracy:.98
};
assert.equal(evaluateFreePilot(syntheticPassingReport).qualified,true);
assert.equal(evaluateFreePilot({...syntheticPassingReport,wasActuallyInvoked:false}).qualified,false);
assert.equal(evaluateFreePilot({...syntheticPassingReport,billingDisabledVerified:false}).qualified,false);
assert.equal(evaluateFreePilot({...syntheticPassingReport,chargedUsd:null}).qualified,false);
assert.equal(evaluateFreePilot({...syntheticPassingReport,sourceAccuracy:.99}).qualified,false);
assert.equal(evaluateFreePilot({...syntheticPassingReport,numericAccuracy:.95}).qualified,false);
assert.equal(evaluateFreePilot({...syntheticPassingReport,falseVerifiedCount:1}).qualified,false);
assert.equal(evaluateFreePilot({...syntheticPassingReport,sourceAccuracy:.97,baselineAccuracy:.98}).qualified,false);
assert.equal(chooseQualifiedFreeModel([{...syntheticPassingReport,wasActuallyInvoked:false}]),BASELINE_GEMINI_MODEL);
assert.equal(chooseQualifiedFreeModel([syntheticPassingReport]),'gemini-3.8-flash');
// Both endpoints must use the policy and cannot unconditionally turn on Search.
for(const path of ['supabase/functions/icaew-ai-route/index.ts','supabase/functions/icaew-ai-import/index.ts']){
  const src=fs.readFileSync(path,'utf8');
  assert.match(src,/resolveGeminiModel\(Deno\.env\.get\("GEMINI_MODEL"\)\)/);
  assert.doesNotMatch(src,/configuredModel\s*!==\s*"gemini-3.8-flash"/);
}
const importCode=fs.readFileSync('supabase/functions/icaew-ai-import/index.ts','utf8');
assert.match(importCode,/freeTierSafeToolConfig\(GEMINI_MODEL\)/);
assert.doesNotMatch(importCode,/tools:\s*\[\{\s*google_search:/);
assert.match(importCode,/NEVER set verification_status=verified/);
console.log('PASS no-cost model compatibility pilot: 7 allowlisted models, paid tool guard, safe fallback.');
console.log('LIVE MODEL ACCURACY: NOT TESTED. No charge/Google API calls made. Auto-promotion: disabled.');
