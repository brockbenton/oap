import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { isAddress } from 'viem';
import { Prisma } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import prisma from '../lib/prisma';
import logger from '../lib/logger';
import {
  buildMemberStats,
  buildMemberVault,
  buildPersonalStats,
} from '../services/stats.service';

const router = Router();

// Palette size mirrors the frontend AVATAR_PAIRS palette (lib/tokenArt.ts).
const AVATAR_COLOR_COUNT = 7;
const BIO_MAX_LENGTH = 160;
const USERNAME_REGEX = /^[a-z0-9_.-]{3,20}$/;
const UNIQUE_VIOLATION = 'P2002';

interface MemberProfile {
  walletAddress: string;
  username: string | null;
  avatarColor: number | null;
  bio: string | null;
  notifyEmail: boolean;
}

type ProfileRow = {
  username: string | null;
  avatarColor: number | null;
  bio: string | null;
  notifyEmail: boolean;
} | null;

function toProfile(walletAddress: string, member: ProfileRow): MemberProfile {
  return {
    walletAddress,
    username: member?.username ?? null,
    avatarColor: member?.avatarColor ?? null,
    bio: member?.bio ?? null,
    notifyEmail: member?.notifyEmail ?? false,
  };
}

// ── GET /api/v1/members/me ──────────────────────────────────────────────────
// Registered before /:address so "me" isn't parsed as an address; returns
// defaults when no member row exists yet (rows are created lazily).

router.get('/me', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const walletAddress = req.user!.walletAddress;
  const member = await prisma.member.findUnique({ where: { walletAddress } });
  res.json({ data: toProfile(walletAddress, member) });
});

// ── PATCH /api/v1/members/me ────────────────────────────────────────────────
// Upsert the caller's profile (so a profile can exist before first check-in).

// Username is lowercased before validation, so the plain unique index enforces
// case-insensitive uniqueness (no citext needed). Keep all writes on this path.
const profilePatchSchema = z.object({
  username: z.string().trim().toLowerCase().regex(USERNAME_REGEX, 'Username must be 3–20 chars: a–z, 0–9, . _ -').optional(),
  avatarColor: z.number().int().min(0).max(AVATAR_COLOR_COUNT - 1).nullable().optional(),
  bio: z.string().max(BIO_MAX_LENGTH).nullable().optional(),
  notifyEmail: z.boolean().optional(),
});

router.patch(
  '/me',
  authMiddleware,
  validate(profilePatchSchema),
  async (req: Request, res: Response): Promise<void> => {
    const walletAddress = req.user!.walletAddress;
    const privyUserId = req.user!.privyUserId;
    const patch = req.body as z.infer<typeof profilePatchSchema>;

    try {
      const member = await prisma.member.upsert({
        where: { walletAddress },
        update: patch,
        create: { walletAddress, privyUserId, ...patch },
      });
      res.json({ data: toProfile(walletAddress, member) });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === UNIQUE_VIOLATION) {
        res.status(409).json({ error: { code: 'USERNAME_TAKEN', message: 'That username is already taken' } });
        return;
      }
      logger.error({ err, walletAddress }, 'Failed to update member profile');
      res.status(500).json({ error: { code: 'INTERNAL', message: 'Could not update profile' } });
    }
  },
);

// ── GET /api/v1/members ───────────────────────────────────────────────────
// Public directory — unauthenticated, so linkedAccount (email/social PII) is
// stripped here; only the auth-gated /admin/members endpoint returns it.

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const { members, totalSessions, currentSemester } = await buildMemberStats(false);

  const publicMembers = members.map(
    ({ linkedAccount: _linkedAccount, id: _id, ...rest }) => rest,
  );

  res.json({ data: { members: publicMembers, totalSessions, currentSemester } });
});

// ── GET /api/v1/members/:address/tokens ─────────────────────────────────────
// A member's attendance-token vault. Public by wallet address (resolved Open
// Question #5) — the same attendance data already surfaced by the directory.

router.get('/:address/tokens', async (req: Request, res: Response): Promise<void> => {
  const { address } = req.params;
  if (!isAddress(address)) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid wallet address' } });
    return;
  }

  const vault = await buildMemberVault(address);
  res.json({ data: vault });
});

// ── GET /api/v1/members/:address/stats ──────────────────────────────────────
// A member's personal attendance statistics (public by wallet address).

router.get('/:address/stats', async (req: Request, res: Response): Promise<void> => {
  const { address } = req.params;
  if (!isAddress(address)) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid wallet address' } });
    return;
  }

  const stats = await buildPersonalStats(address);
  res.json({ data: stats });
});

export default router;
