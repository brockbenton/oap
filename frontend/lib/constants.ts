// App brand — change here to rename everywhere.
export const APP_NAME = 'Onchain Club Protocol';
export const APP_SHORT_NAME = 'OCP';

// Club display name. Single-club deployment for now (there is no clubs backend),
// so this is a deployment label; it becomes per-club data with multi-club support.
export const CLUB_NAME = 'Blockchain Club';

// Attendance-percentage color thresholds, shared by the members table and the
// personal-stats page so the "good / ok / low" coloring is consistent.
export const ATTENDANCE_GOOD_PCT = 75;
export const ATTENDANCE_OK_PCT = 50;

// External links surfaced across the marketing surface.
export const GITHUB_URL = 'https://github.com/brockbenton/ocp';
// Base Sepolia block explorer (chain 84532). Append `/address/<addr>` or `/tx/<hash>`.
export const BASESCAN_URL = 'https://sepolia.basescan.org';

// Deployed registry, from env. Deep-links to Basescan when configured; falls back
// to the explorer home so the link is never dead.
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
export const CONTRACT_EXPLORER_URL = CONTRACT_ADDRESS
  ? `${BASESCAN_URL}/address/${CONTRACT_ADDRESS}`
  : BASESCAN_URL;
