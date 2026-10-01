export function googleReviewsHref(input?: {
  google_reviews_url?: string | null;
  google_place_id?: string | null;
} | null): string | null {
  const direct = String(input?.google_reviews_url || '').trim();
  if (direct) return direct;
  return null;
}
