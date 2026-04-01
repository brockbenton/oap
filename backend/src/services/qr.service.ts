import { verifyMessage } from 'viem';
import { v4 as uuidv4 } from 'uuid';
import { adminAccount } from '../lib/contract';
import { QREnvelope, QRPayload } from '../types';

const QR_TTL_MS = parseInt(process.env.QR_TTL_MS ?? '600000');

export async function generateQR(sessionId: string): Promise<string> {
  const issuedAt = Date.now();
  const payload: QRPayload = {
    sessionId,
    issuedAt,
    expiresAt: issuedAt + QR_TTL_MS,
    nonce: uuidv4(),
  };

  const message = JSON.stringify(payload);
  const signature = await adminAccount.signMessage({ message });

  const envelope: QREnvelope = { payload, signature };
  return Buffer.from(JSON.stringify(envelope)).toString('base64');
}

export async function verifyQR(encoded: string): Promise<QRPayload> {
  let envelope: QREnvelope;
  try {
    envelope = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8')) as QREnvelope;
  } catch {
    throw new Error('Malformed QR payload');
  }

  const { payload, signature } = envelope;

  if (
    typeof payload.sessionId !== 'string' ||
    typeof payload.issuedAt !== 'number' ||
    typeof payload.expiresAt !== 'number' ||
    typeof payload.nonce !== 'string'
  ) {
    throw new Error('Malformed QR payload');
  }

  if (Date.now() > payload.expiresAt) {
    throw new Error('QR code expired');
  }

  const valid = await verifyMessage({
    address: adminAccount.address,
    message: JSON.stringify(payload),
    signature,
  });

  if (!valid) {
    throw new Error('Invalid QR signature');
  }

  return payload;
}
