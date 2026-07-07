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
