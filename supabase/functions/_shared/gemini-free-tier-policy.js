/**
 * Accounting LMS zero-charge policy gate. It is deliberately conservative:
 * documenting a Free Tier does not establish that the connected Google project
 * has billing disabled or that this user's account has enough quota remaining.
 *
 * Never run candidate inference automatically or enable paid tools until a
 * real, consented, billing-safe benchmark has been independently confirmed.
 */
export const BASELINE_GEMINI_MODEL = 'gemini-3.5-flash-lite';
export const FREE_VISION_MODEL_CANDIDATES = Object.freeze([
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
]);
export function resolveGeminiModel(raw) {
  const candidate = String(raw ?? '').trim();
  return FREE_VISION_MODEL_CANDIDATES.includes(candidate) ? candidate : BASELINE_GEMINI_MODEL;
}
export function freeTierSafeToolConfig(_model) {
  // Google Search grounding is not available on Gemini 3.x API Free Tier;
  // Gemini 2.5 can also incur charges when an API key is attached to billing.
  // Avoid automatic billable searches in every model, including 2.5.
  return {};
}
/**
 * Qualification gate for a future REAL (not simulated) benchmark. A model is
 * never accepted on higher version/name alone. Every criterion must be proved.
 */
export function evaluateFreePilot({
  model, wasActuallyInvoked = false, billingDisabledVerified = false,
  chargedUsd, supportsImage, supportsPdf, validStructuredOutput,
  sourceAccuracy, numericAccuracy, falseVerifiedCount, baselineAccuracy
} = {}) {
  const reason = [];
  if (!FREE_VISION_MODEL_CANDIDATES.includes(model)) reason.push('model_not_allowlisted');
  if (!wasActuallyInvoked) reason.push('no_live_model_evidence');
  if (!billingDisabledVerified || chargedUsd !== 0) reason.push('zero_cost_not_verified');
  if (supportsImage !== true || supportsPdf !== true) reason.push('source_modality_unverified');
  if (validStructuredOutput !== true) reason.push('invalid_json_contract');
  if (!(Number.isFinite(sourceAccuracy) && sourceAccuracy >= .995)) reason.push('ocr_below_threshold');
  if (numericAccuracy !== 1) reason.push('numeric_accuracy_not_perfect');
  if (falseVerifiedCount !== 0) reason.push('false_verification_claim');
  if (!(Number.isFinite(baselineAccuracy) && sourceAccuracy >= baselineAccuracy)) reason.push('no_improvement_over_baseline');
  return {model,qualified:reason.length===0,reasons:reason};
}
export function chooseQualifiedFreeModel(reports = []) {
  for (const id of FREE_VISION_MODEL_CANDIDATES) {
    const report = reports.find(r=>r?.model===id);
    if (report && evaluateFreePilot(report).qualified) return id;
  }
  return BASELINE_GEMINI_MODEL;
}
