/**
 * Deterministic, self-contained SVG art for attendance tokens and status badges,
 * generated (not fetched) so app imagery always resolves without external assets
 * or a pinned CID. The on-chain metadata image is handled by the IPFS pipeline.
 */
const CLUB_NAME = 'Blockchain Club';
const PUBLIC_API_URL = (process.env.PUBLIC_API_URL ?? '').replace(/\/$/, '');

const XML_ESCAPES: Record<string, string> = {
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  "'": '&apos;',
  '"': '&quot;',
};

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (c) => XML_ESCAPES[c]);
}

// Stable hue in [0,360) so a semester (or tier) always renders the same color.
function hashHue(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) % 360;
  return h;
}

export function renderSemesterBadgeSvg(semester: string): string {
  const hue = hashHue(semester);
  const c1 = `hsl(${hue} 75% 55%)`;
  const c2 = `hsl(${(hue + 40) % 360} 70% 42%)`;
  const label = escapeXml(semester);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" role="img" aria-label="${CLUB_NAME} attendance token — ${label}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
  <rect width="512" height="512" rx="48" fill="url(#g)"/>
  <circle cx="256" cy="212" r="118" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.65)" stroke-width="6"/>
  <text x="256" y="248" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="104" font-weight="700" fill="#fff">AT</text>
  <text x="256" y="404" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700" fill="#fff">${CLUB_NAME}</text>
  <text x="256" y="448" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="28" fill="rgba(255,255,255,0.92)">${label}</text>
</svg>`;
}

export function semesterArtPath(semester: string): string {
  return `/api/v1/art/${encodeURIComponent(semester)}`;
}

export function semesterArtUrl(semester: string): string {
  return `${PUBLIC_API_URL}${semesterArtPath(semester)}`;
}

export type BadgeTier = 'general' | 'official' | 'founding';

const TIER_STYLES: Record<BadgeTier, { label: string; c1: string; c2: string }> = {
  general: { label: 'General Member', c1: 'hsl(215 16% 55%)', c2: 'hsl(215 22% 38%)' },
  official: { label: 'Official Member', c1: 'hsl(217 90% 60%)', c2: 'hsl(224 76% 42%)' },
  founding: { label: 'Founding Member', c1: 'hsl(38 92% 58%)', c2: 'hsl(30 90% 45%)' },
};

/** Founding outranks the attendance tier for badge purposes. */
export function badgeTierFor(statusTier: string, foundingMember: boolean): BadgeTier {
  if (foundingMember) return 'founding';
  return statusTier === 'Official Member' ? 'official' : 'general';
}

export function renderTierBadgeSvg(tier: string): string {
  const style = TIER_STYLES[(tier as BadgeTier)] ?? TIER_STYLES.general;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" role="img" aria-label="${escapeXml(style.label)} — ${CLUB_NAME}">
  <defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${style.c1}"/><stop offset="1" stop-color="${style.c2}"/></linearGradient></defs>
  <rect width="512" height="512" rx="48" fill="#0f172a"/>
  <path d="M256 56 l150 54 v120 c0 118 -74 190 -150 226 c-76 -36 -150 -108 -150 -226 v-120 z" fill="url(#b)" stroke="rgba(255,255,255,0.7)" stroke-width="6"/>
  <text x="256" y="250" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="120" font-weight="800" fill="#fff">★</text>
  <text x="256" y="330" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700" fill="#fff">${escapeXml(style.label)}</text>
  <text x="256" y="372" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="rgba(255,255,255,0.9)">${CLUB_NAME}</text>
</svg>`;
}

export function tierBadgePath(tier: BadgeTier): string {
  return `/api/v1/badge/${tier}`;
}

export function tierBadgeUrl(tier: BadgeTier): string {
  return `${PUBLIC_API_URL}${tierBadgePath(tier)}`;
}
