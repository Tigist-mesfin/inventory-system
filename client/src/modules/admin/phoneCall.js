/** Build a tel: href from stored company/owner phone values. */
export function telHref(phone) {
  if (!phone) return null;
  const digits = String(phone).trim().replace(/[^\d+]/g, "");
  if (!digits) return null;
  return `tel:${digits}`;
}
