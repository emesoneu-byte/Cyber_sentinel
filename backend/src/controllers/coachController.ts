import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbRun, dbGet, dbAll } from '../database';
import { getCoachReply } from '../services/coach';
import { config } from '../config';
import { audit } from '../utils/audit';

interface MsgRow { id: string; role: 'user' | 'assistant'; content: string; created_at: string; }

function checkRateLimit(userId: string): boolean {
  const count = dbGet<{ c: number }>(`SELECT COUNT(*) as c FROM coach_messages WHERE user_id=? AND role='user' AND created_at>=datetime('now','-1 hour')`, [userId]);
  return (count?.c ?? 0) < config.ai.rateLimitPerHour;
}

export async function sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { message } = req.body as { message: string };
    const userId = req.user.sub;
    if (!message?.trim()) { res.status(400).json({ error: 'message is required' }); return; }
    if (message.length > 2000) { res.status(400).json({ error: 'message too long (max 2000 chars)' }); return; }
    if (!checkRateLimit(userId)) { res.status(429).json({ error: `Rate limit: max ${config.ai.rateLimitPerHour} messages per hour` }); return; }

    dbRun('INSERT INTO coach_messages(id,user_id,role,content)VALUES(?,?,?,?)', [uuidv4(), userId, 'user', message]);
    const history = dbAll<MsgRow>('SELECT id,role,content,created_at FROM coach_messages WHERE user_id=? ORDER BY created_at ASC LIMIT 40', [userId]).slice(-20);
    const { reply, suggestedFollowUps, mode } = await getCoachReply(userId, history.map(h => ({ role: h.role, content: h.content })));
    dbRun('INSERT INTO coach_messages(id,user_id,role,content)VALUES(?,?,?,?)', [uuidv4(), userId, 'assistant', reply]);
    audit(userId, 'COACH_MESSAGE', { messageLength: message.length, mode }, req.ip ?? null);
    res.json({ reply, suggestedFollowUps, mode });
  } catch (err) { next(err); }
}

export function getHistory(req: Request, res: Response): void {
  res.json({ messages: dbAll<MsgRow>('SELECT id,role,content,created_at FROM coach_messages WHERE user_id=? ORDER BY created_at ASC', [req.user.sub]) });
}

export function clearHistory(req: Request, res: Response, next: NextFunction): void {
  try {
    dbRun('DELETE FROM coach_messages WHERE user_id=?', [req.user.sub]);
    audit(req.user.sub, 'COACH_HISTORY_CLEAR', null, req.ip ?? null);
    res.json({ message: 'Chat history cleared' });
  } catch (err) { next(err); }
}
