import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
let db: Database|null=null, dbFilePath: string|null=null;
function persist(): void { if(!db||!dbFilePath)return; try{const d=db.export();fs.writeFileSync(dbFilePath,Buffer.from(d));}catch(e){console.error('[DB]',(e as Error).message);} }
export async function initDB(filePath: string): Promise<Database> {
  dbFilePath=filePath;
  const dir=path.dirname(filePath);
  if(!fs.existsSync(dir))fs.mkdirSync(dir,{recursive:true});
  const SQL=await initSqlJs();
  db=fs.existsSync(filePath)?new SQL.Database(fs.readFileSync(filePath)):new SQL.Database();
  console.log('[DB] Ready:',filePath);
  applySchema();
  setInterval(persist,30000);
  process.on('exit',persist);
  process.on('SIGINT',()=>{persist();process.exit(0);});
  process.on('SIGTERM',()=>{persist();process.exit(0);});
  return db;
}
function applySchema(): void {
  if(!db)throw new Error('DB not init');
  db.run('PRAGMA journal_mode=WAL;');
  db.run('PRAGMA foreign_keys=ON;');
  db.run(`CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,username TEXT UNIQUE NOT NULL,password TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'user',department TEXT,is_active INTEGER NOT NULL DEFAULT 1,xp INTEGER NOT NULL DEFAULT 0,streak INTEGER NOT NULL DEFAULT 0,last_active TEXT,created_at TEXT NOT NULL DEFAULT(datetime('now')),updated_at TEXT NOT NULL DEFAULT(datetime('now')));`);
  db.run(`CREATE TABLE IF NOT EXISTS refresh_tokens(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,token_hash TEXT NOT NULL,expires_at TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT(datetime('now')),FOREIGN KEY(user_id)REFERENCES users(id)ON DELETE CASCADE);`);
  db.run(`CREATE TABLE IF NOT EXISTS scenario_results(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,scenario_id INTEGER NOT NULL,category TEXT NOT NULL,difficulty TEXT NOT NULL,passed INTEGER NOT NULL,chosen INTEGER NOT NULL,xp_earned INTEGER NOT NULL DEFAULT 0,time_taken INTEGER,completed_at TEXT NOT NULL DEFAULT(datetime('now')),FOREIGN KEY(user_id)REFERENCES users(id)ON DELETE CASCADE);`);
  db.run(`CREATE TABLE IF NOT EXISTS quiz_results(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,score INTEGER NOT NULL,total INTEGER NOT NULL,pct INTEGER NOT NULL,xp_earned INTEGER NOT NULL DEFAULT 0,answers TEXT NOT NULL,completed_at TEXT NOT NULL DEFAULT(datetime('now')),FOREIGN KEY(user_id)REFERENCES users(id)ON DELETE CASCADE);`);
  db.run(`CREATE TABLE IF NOT EXISTS module_progress(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,module_id TEXT NOT NULL,completed INTEGER NOT NULL DEFAULT 0,xp_earned INTEGER NOT NULL DEFAULT 0,completed_at TEXT,UNIQUE(user_id,module_id),FOREIGN KEY(user_id)REFERENCES users(id)ON DELETE CASCADE);`);
  db.run(`CREATE TABLE IF NOT EXISTS user_badges(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,badge_id TEXT NOT NULL,earned_at TEXT NOT NULL DEFAULT(datetime('now')),UNIQUE(user_id,badge_id),FOREIGN KEY(user_id)REFERENCES users(id)ON DELETE CASCADE);`);
  db.run(`CREATE TABLE IF NOT EXISTS audit_log(id TEXT PRIMARY KEY,user_id TEXT,action TEXT NOT NULL,detail TEXT,ip TEXT,created_at TEXT NOT NULL DEFAULT(datetime('now')));`);
  db.run(`CREATE TABLE IF NOT EXISTS email_templates(id TEXT PRIMARY KEY,name TEXT NOT NULL,category TEXT NOT NULL,difficulty TEXT NOT NULL,subject TEXT NOT NULL,sender_name TEXT NOT NULL,sender_email TEXT NOT NULL,html_body TEXT NOT NULL,landing_page_html TEXT,red_flags TEXT NOT NULL DEFAULT'[]',created_at TEXT NOT NULL DEFAULT(datetime('now')));`);
  db.run(`CREATE TABLE IF NOT EXISTS campaigns(id TEXT PRIMARY KEY,name TEXT NOT NULL,template_id TEXT NOT NULL,created_by TEXT NOT NULL,status TEXT NOT NULL DEFAULT'draft',scheduled_at TEXT,started_at TEXT,completed_at TEXT,target_department TEXT,created_at TEXT NOT NULL DEFAULT(datetime('now')),FOREIGN KEY(template_id)REFERENCES email_templates(id),FOREIGN KEY(created_by)REFERENCES users(id));`);
  db.run(`CREATE TABLE IF NOT EXISTS campaign_recipients(id TEXT PRIMARY KEY,campaign_id TEXT NOT NULL,user_id TEXT NOT NULL,status TEXT NOT NULL DEFAULT'pending',tracking_token TEXT NOT NULL UNIQUE,sent_at TEXT,opened_at TEXT,clicked_at TEXT,reported_at TEXT,submitted_data_at TEXT,ip_address TEXT,user_agent TEXT,UNIQUE(campaign_id,user_id),FOREIGN KEY(campaign_id)REFERENCES campaigns(id)ON DELETE CASCADE,FOREIGN KEY(user_id)REFERENCES users(id)ON DELETE CASCADE);`);
  db.run(`CREATE TABLE IF NOT EXISTS coach_messages(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN('user','assistant')),content TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT(datetime('now')),FOREIGN KEY(user_id)REFERENCES users(id)ON DELETE CASCADE);`);
  ['CREATE INDEX IF NOT EXISTS idx_sr_user ON scenario_results(user_id);','CREATE INDEX IF NOT EXISTS idx_qr_user ON quiz_results(user_id);','CREATE INDEX IF NOT EXISTS idx_mp_user ON module_progress(user_id);','CREATE INDEX IF NOT EXISTS idx_rt_user ON refresh_tokens(user_id);','CREATE INDEX IF NOT EXISTS idx_al_user ON audit_log(user_id);','CREATE INDEX IF NOT EXISTS idx_cr_token ON campaign_recipients(tracking_token);','CREATE INDEX IF NOT EXISTS idx_coach_user ON coach_messages(user_id,created_at);'].forEach(s=>db!.run(s));
  console.log('[DB] Schema ready');
}
export function dbRun(sql: string, params: unknown[]=[]): void { if(!db)throw new Error('DB not init'); db.run(sql,params as never[]); }
export function dbGet<T=Record<string,unknown>>(sql: string, params: unknown[]=[]): T|null { if(!db)throw new Error('DB not init'); const s=db.prepare(sql); s.bind(params as never[]); if(s.step()){const r=s.getAsObject() as T;s.free();return r;} s.free();return null; }
export function dbAll<T=Record<string,unknown>>(sql: string, params: unknown[]=[]): T[] { if(!db)throw new Error('DB not init'); const s=db.prepare(sql); s.bind(params as never[]); const rows: T[]=[]; while(s.step())rows.push(s.getAsObject() as T); s.free();return rows; }
