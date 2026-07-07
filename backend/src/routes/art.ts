import { Router, Request, Response } from 'express';
import { renderSemesterBadgeSvg, renderTierBadgeSvg } from '../services/art.service';

const router = Router();

function sendSvg(res: Response, svg: string): void {
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(svg);
}

// Public, generated SVG assets: per-semester token badge and member-tier badge.
router.get('/art/:semester', (req: Request, res: Response): void => {
  sendSvg(res, renderSemesterBadgeSvg(req.params.semester));
});

router.get('/badge/:tier', (req: Request, res: Response): void => {
  sendSvg(res, renderTierBadgeSvg(req.params.tier.toLowerCase()));
});

export default router;
