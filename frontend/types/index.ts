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
  sessionIdOnchain: string;
  name: string;
  date: string;
  semester: string;
  createdAt: string;
  closedAt: string | null;
  onchainStatus: 'PENDING' | 'CONFIRMED' | 'FAILED';
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
