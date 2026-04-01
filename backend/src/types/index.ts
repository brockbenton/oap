export interface AuthUser {
  privyUserId: string;
  walletAddress: string; // lowercase, from Privy-verified linked wallet
}

export interface QRPayload {
  sessionId: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
}

export interface QREnvelope {
  payload: QRPayload;
  signature: `0x${string}`;
}
