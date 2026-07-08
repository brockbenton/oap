// QR envelope decoded from a scanned QR code
export interface QRPayload {
  sessionId: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
}

export interface QREnvelope {
  payload: QRPayload;
  signature: string;
}

// Session from the backend API
export interface Session {
  id: string;
  sessionId: string;
  name: string;
  date: string;
  semester: string;
  createdBy: string;
  txHash: string | null;
  closeTxHash: string | null;
  onchainStatus: 'PENDING' | 'CONFIRMED' | 'FAILED';
  closedAt: string | null;
  createdAt: string;
}

// Session with attendee count (admin list endpoint)
export interface SessionWithCount extends Session {
  attendeeCount: number;
}

// Attendee entry from admin sessions/:id/attendees endpoint
export interface Attendee {
  walletAddress: string;
  checkedInAt: string;
  mintStatus: 'PENDING' | 'CONFIRMED' | 'FAILED';
  txHash: string | null;
}

// Member stats from GET /api/v1/admin/members
export interface MemberStats {
  id: string;
  walletAddress: string;
  linkedAccount: string | null;
  foundingMember: boolean;
  tokensEarned: number;
  allTimeAttendancePct: number;
  currentSemesterAttendancePct: number;
  statusTier: 'General Member' | 'Official Member';
  lastSeen: string | null;
}

export interface MembersListResponse {
  members: MemberStats[];
  totalSessions: number;
  currentSemester: string | null;
}

// Attendance token in a member's vault (GET /api/v1/members/:address/tokens)
export interface VaultToken {
  tokenId: string;
  sessionIdOnchain: string;
  name: string;
  date: string;
  semester: string;
  meetingNumber: number;
  mintStatus: 'PENDING' | 'CONFIRMED' | 'FAILED';
  txHash: string | null;
  imageUrl: string;
  metadataUri: string | null;
}

export interface MemberVault {
  walletAddress: string;
  found: boolean;
  tokenCount: number;
  tokens: VaultToken[];
}

export interface SemesterStat {
  semester: string;
  attended: number;
  total: number;
  pct: number;
}

// Personal attendance stats (GET /api/v1/members/:address/stats)
export interface PersonalStats {
  walletAddress: string;
  found: boolean;
  foundingMember: boolean;
  tokensEarned: number;
  totalSessions: number;
  allTimeAttendancePct: number;
  currentSemester: string | null;
  currentSemesterTotal: number;
  currentSemesterAttendancePct: number;
  statusTier: 'General Member' | 'Official Member';
  meetingsLast30Days: number;
  meetingsLast90Days: number;
  meetingsLast180Days: number;
  currentStreak: number;
  longestStreak: number;
  lastSeen: string | null;
  semesterBreakdown: SemesterStat[];
  badgeUrl: string;
}

// Admin overview from GET /api/v1/admin/overview
export interface OverviewSessionPoint {
  sessionIdOnchain: string;
  name: string;
  date: string;
  semester: string;
  headcount: number;
  eligibleMembers: number;
  attendanceRate: number;
}

export interface AdminOverview {
  totalMembers: number;
  totalSessions: number;
  currentSemester: string | null;
  avgHeadcount: number;
  series: OverviewSessionPoint[];
  latest: { headcount: number; attendanceRate: number } | null;
  previous: { headcount: number; attendanceRate: number } | null;
  wow: { headcountDelta: number; attendanceRateDelta: number } | null;
}

// GET /api/v1/admin/me — admin-gate probe
export interface AdminMe {
  isAdmin: boolean;
  walletAddress: string;
}

// Admin role from GET /api/v1/admin/roles
export interface AdminRole {
  id: string;
  walletAddress: string;
  grantedBy: string;
  grantedAt: string;
  revokedAt: string | null;
  txHash?: string;
}

// Check-in response from POST /api/v1/check-in
export interface CheckInResponse {
  checkInId: string;
  jobId: string;
  sessionId: string;
  memberAddress: string;
  status: 'PENDING';
}

// Generic API response wrappers
export interface ApiSuccess<T> {
  data: T;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

// --- Frontend sample-data domains (gamification, explore, live meeting) ---

export interface Level {
  level: number;
  xp: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
}

export interface LeaderboardEntry {
  rank: number;
  handle: string;
  avatarSeed: string;
  streakWeeks: number;
  tokens: number;
  xp: number;
  isYou: boolean;
}

export interface Reward {
  id: string;
  title: string;
  description: string;
  requiredLevel: number;
  status: 'ready' | 'locked' | 'claimed';
}

export interface Club {
  id: string;
  name: string;
  org: string;
  handle: string;
  category: 'University' | 'DAO' | 'Meetup';
  monogram: string;
  members: number;
  meetings: number;
  tokens: number;
  joined: boolean;
}

export interface MintFeedItem {
  id: string;
  handle: string;
  avatarSeed: string;
  topic: string;
  gradient: import('@/lib/tokenArt').GradientName;
  club: string;
  timeAgo: string;
  txHash: string;
  editionNumber: number;
}

export interface Collector {
  rank: number;
  handle: string;
  avatarSeed: string;
  tokens: number;
}

export interface TrendingTopic {
  topic: string;
  count: number;
}

export interface RosterEntry {
  handle: string;
  avatarSeed: string;
  secondsAgo: number;
}

export interface LiveMeeting {
  topic: string;
  week: number;
  club: string;
  checkedIn: number;
  totalMembers: number;
  elapsedSeconds: number;
  roster: RosterEntry[];
}

// Editable member profile (GET/PATCH /members/me). avatarColor indexes the
// avatar palette (lib/tokenArt.ts); null means fall back to the seed-derived color.
export interface MemberProfile {
  walletAddress: string;
  username: string | null;
  avatarColor: number | null;
  bio: string | null;
  notifyEmail: boolean;
}
