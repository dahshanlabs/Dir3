import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import attacksRouter from "./attacks.js";
import playgroundRouter from "./playground.js";
import shieldRouter from "./shield.js";
import scannerRouter from "./scanner.js";
import leaderboardRouter from "./leaderboard.js";
import statsRouter from "./stats.js";
import detectRouter from "./detect.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(attacksRouter);
router.use(playgroundRouter);
router.use(shieldRouter);
router.use(scannerRouter);
router.use(leaderboardRouter);
router.use(statsRouter);
router.use(detectRouter);

export default router;
