import rateLimit from 'express-rate-limit';
import { Request } from 'express';

// Keyed per authenticated user (NOT per IP): at a physical meeting the whole room
// shares one NAT/wifi IP, so an IP limiter would throttle legitimate check-ins.
// Must run AFTER authMiddleware so req.user is populated.
const CHECK_IN_WINDOW_MS = 60_000;
const CHECK_IN_MAX_PER_WINDOW = 30;

export const checkInLimiter = rateLimit({
  windowMs: CHECK_IN_WINDOW_MS,
  limit: CHECK_IN_MAX_PER_WINDOW,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.user?.privyUserId ?? 'anonymous',
  handler: (_req, res) => {
    res.status(429).json({
      error: { code: 'RATE_LIMITED', message: 'Too many check-in attempts. Please wait a moment.' },
    });
  },
});
