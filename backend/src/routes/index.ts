import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config';
import { authenticate, requireRole } from '../middleware/auth';
import { validate, registerRules, loginRules, scenarioResultRules, quizResultRules, moduleProgressRules, updateProfileRules, createTemplateRules, createCampaignRules, trackReportRules, coachMessageRules } from '../validators';
import * as auth from '../controllers/authController';
import * as user from '../controllers/userController';
import * as sim from '../controllers/simulationController';
import * as campaign from '../controllers/campaignController';
import * as coach from '../controllers/coachController';
import { submitQuiz, getMyQuizHistory, getAllQuizResults, completeModule, getMyModuleProgress, getUsers, getAdminUser, updateAdminUser, deleteAdminUser, getOrgStats, getAuditLog } from '../controllers/otherControllers';

const router = Router();
const authLimiter = rateLimit({ windowMs: config.rateLimit.windowMs, max: config.rateLimit.authMax, message: { error: 'Too many auth attempts — try again in 15 minutes' }, standardHeaders: true, legacyHeaders: false });
const coachLimiter = rateLimit({ windowMs: 60*60*1000, max: config.ai.rateLimitPerHour*3, message: { error: 'Too many AI coach requests' }, standardHeaders: true, legacyHeaders: false });

// Health
router.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString(), version: '1.0.0' }));

// Auth
router.post('/auth/register', authLimiter, registerRules, validate, auth.register);
router.post('/auth/login',    authLimiter, loginRules, validate, auth.login);
router.post('/auth/refresh',  auth.refresh);
router.post('/auth/logout',   authenticate, auth.logout);

// Users
router.get('/users/me',          authenticate, user.getMe);
router.patch('/users/me',        authenticate, updateProfileRules, validate, user.updateProfile);
router.get('/users/dashboard',   authenticate, user.getDashboard);
router.get('/users/leaderboard', authenticate, user.getLeaderboard);
router.get('/users/:id',         authenticate, user.getProfile);

// Simulations
router.post('/simulations/results',                authenticate, scenarioResultRules, validate, sim.submitResult);
router.get('/simulations/results/me',              authenticate, sim.getMyResults);
router.get('/simulations/results/me/:scenarioId',  authenticate, sim.getMyResultByScenario);
router.get('/simulations/stats',                   authenticate, sim.getScenarioStats);

// Quiz
router.post('/quiz/results',   authenticate, quizResultRules, validate, submitQuiz);
router.get('/quiz/results/me', authenticate, getMyQuizHistory);

// Modules
router.post('/modules/complete',  authenticate, moduleProgressRules, validate, completeModule);
router.get('/modules/progress',   authenticate, getMyModuleProgress);

// AI Coach
router.post('/coach/message',   authenticate, coachLimiter, coachMessageRules, validate, coach.sendMessage);
router.get('/coach/history',    authenticate, coach.getHistory);
router.delete('/coach/history', authenticate, coach.clearHistory);

// Admin
router.get('/admin/users',                    authenticate, requireRole('admin'), getUsers);
router.get('/admin/users/:id',                authenticate, requireRole('admin'), getAdminUser);
router.patch('/admin/users/:id',              authenticate, requireRole('admin'), updateAdminUser);
router.delete('/admin/users/:id',             authenticate, requireRole('admin'), deleteAdminUser);
router.get('/admin/stats',                    authenticate, requireRole('admin'), getOrgStats);
router.get('/admin/audit',                    authenticate, requireRole('admin'), getAuditLog);
router.get('/admin/simulations/results',      authenticate, requireRole('admin'), sim.getAllResults);
router.get('/admin/quiz/results',             authenticate, requireRole('admin'), getAllQuizResults);
router.post('/admin/templates',               authenticate, requireRole('admin'), createTemplateRules, validate, campaign.createTemplate);
router.get('/admin/templates',                authenticate, requireRole('admin'), campaign.getTemplates);
router.get('/admin/templates/:id',            authenticate, requireRole('admin'), campaign.getTemplate);
router.delete('/admin/templates/:id',         authenticate, requireRole('admin'), campaign.deleteTemplate);
router.post('/admin/campaigns',               authenticate, requireRole('admin'), createCampaignRules, validate, campaign.createCampaign);
router.get('/admin/campaigns',                authenticate, requireRole('admin'), campaign.getCampaigns);
router.get('/admin/campaigns/analytics',      authenticate, requireRole('admin'), campaign.getCampaignAnalytics);
router.get('/admin/campaigns/:id',            authenticate, requireRole('admin'), campaign.getCampaignDetail);
router.post('/admin/campaigns/:id/launch',    authenticate, requireRole('admin'), campaign.launchCampaign);
router.post('/admin/test-email',              authenticate, requireRole('admin'), campaign.testSmtp);
router.post('/admin/campaigns/:id/cancel',    authenticate, requireRole('admin'), campaign.cancelCampaign);

// Public tracking (no auth — accessed from email links)
router.get('/track/open/:token',  campaign.trackOpen);
router.get('/track/click/:token', campaign.trackClick);
router.post('/track/report',      trackReportRules, validate, campaign.trackReport);
router.get('/track/my-result',    campaign.getMyTrainingResult);

export default router;
