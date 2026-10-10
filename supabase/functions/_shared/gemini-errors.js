// Keep quota failures distinct from server failures; never retry a daily quota in a loop.
/**
 * @param {number} status
 * @param {any} data
 * @param {string|null} [retryAfterHeader]
 */
export function geminiFailure(status, data, retryAfterHeader = null) {
  const details = Array.isArray(data?.error?.details) ? data.error.details : [];
  const violations = details.flatMap(item => Array.isArray(item.violations) ? item.violations : []);
  const quotaText = violations.map(item => `${item.quotaId || ''} ${item.quotaMetric || ''}`).join(' ');
  const quotaScope = /perday|per_day|daily/i.test(quotaText) ? 'daily'
    : /perminute|per_minute/i.test(quotaText) ? 'minute' : 'unknown';
  const retryInfo = details.find(item => String(item['@type'] || '').endsWith('google.rpc.RetryInfo'));
  const delay = retryInfo?.retryDelay;
  let retryAfter = typeof delay === 'string' && /^\d+(\.\d+)?s$/.test(delay)
    ? Math.ceil(Number(delay.slice(0, -1)))
    : delay && typeof delay === 'object' ? Math.ceil(Number(delay.seconds || 0) + Number(delay.nanos || 0) / 1e9) : null;
  if (retryAfter == null && retryAfterHeader && /^\d+$/.test(retryAfterHeader)) retryAfter = Number(retryAfterHeader);
  if (!Number.isFinite(retryAfter) || retryAfter <= 0) retryAfter = null;
  if (quotaScope === 'daily') retryAfter = null; // RetryInfo may only describe an accompanying minute limit.

  if (status === 429) {
    return {
      status: 429,
      body: {
        error: quotaScope === 'daily'
          ? 'AI đã hết hạn mức trong ngày. Bạn có thể lưu bản nháp và nhập nội dung thủ công, rồi thử AI lại khi hạn mức được đặt lại.'
          : retryAfter
          ? `AI đang chạm hạn mức. Hãy thử lại sau ${retryAfter} giây hoặc tiếp tục nhập thủ công.`
          : 'AI hiện không còn hạn mức cho yêu cầu này. Bạn vẫn có thể lưu bản nháp và nhập nội dung thủ công.',
        code: 'AI_QUOTA_EXCEEDED', provider: 'gemini', quota_scope: quotaScope,
        retryable: quotaScope !== 'daily', retry_after_seconds: retryAfter,
      },
    };
  }
  return {
    status: status === 503 ? 503 : 502,
    body: {
      error: 'AI tạm chưa xử lý được tài liệu. Bạn có thể thử lại hoặc tiếp tục nhập thủ công.',
      code: 'AI_PROVIDER_UNAVAILABLE', provider: 'gemini',
      retryable: status >= 500, retry_after_seconds: retryAfter,
    },
  };
}
