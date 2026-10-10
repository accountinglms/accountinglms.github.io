// Reject active markup without treating ordinary equations as HTML attributes.
export function hasUnsafeMarkup(text) {
  return /<\s*(script|iframe|object|embed|svg|math|style|link|meta)\b|javascript:/i.test(text) ||
    /<\s*[a-z][\w:-]*\b[^>]*[\s/]+on[a-z]+\s*=/i.test(text);
}
