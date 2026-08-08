import{Request,Response,NextFunction}from'express';
import{v4 as uuidv4}from'uuid';
import{dbRun,dbGet,dbAll}from'../database';
import{checkAndAwardBadges,computeStats}from'../utils/badges';
import{audit}from'../utils/audit';
import{revokeAllUserTokens}from'../utils/jwt';
import{qs,qsInt,param}from'../utils/qs';
import{MODULE_XP}from'../types';
import type{QuizResultBody,User}from'../types';
export function submitQuiz(req:Request<object,object,QuizResultBody>,res:Response,next:NextFunction):void{
  try{
    const{score,total,answers}=req.body;const userId=req.user.sub;
    const pct=Math.round((score/total)*100);
    // Only the first quiz attempt awards XP — retakes are for practice and do not inflate score
    const prior=(dbGet<{c:number}>('SELECT COUNT(*) as c FROM quiz_results WHERE user_id=?',[userId])??{c:0}).c;
    const xpEarned=prior===0?Math.round(pct/2):0;
    const id=uuidv4();
    dbRun('INSERT INTO quiz_results(id,user_id,score,total,pct,xp_earned,answers)VALUES(?,?,?,?,?,?,?)',[id,userId,score,total,pct,xpEarned,JSON.stringify(answers)]);
    if(xpEarned>0)dbRun(`UPDATE users SET xp=xp+?,last_active=datetime('now'),updated_at=datetime('now') WHERE id=?`,[xpEarned,userId]);
    else dbRun(`UPDATE users SET last_active=datetime('now'),updated_at=datetime('now') WHERE id=?`,[userId]);
    audit(userId,'QUIZ_SUBMIT',{score,total,pct,xpEarned,retake:prior>0},req.ip??null);
    res.json({id,score,total,pct,xpEarned,grade:pct>=90?'A':pct>=75?'B':pct>=60?'C':'D',newBadges:checkAndAwardBadges(userId),message:prior>0?'Retake recorded — no additional XP.':(pct>=70?'Passed!':'Keep practising.')});
  }catch(err){next(err);}
}
export function getMyQuizHistory(req:Request,res:Response):void{
  interface QR{id:string;score:number;total:number;pct:number;xp_earned:number;answers:string;completed_at:string}
  const results=dbAll<QR>('SELECT id,score,total,pct,xp_earned,answers,completed_at FROM quiz_results WHERE user_id=? ORDER BY completed_at DESC',[req.user.sub]);
  const best=results.length>0?Math.max(...results.map(r=>r.pct)):null;
  const avg=results.length>0?Math.round(results.reduce((a,b)=>a+b.pct,0)/results.length):null;
  res.json({results:results.map(r=>({...r,answers:JSON.parse(r.answers) as unknown})),best,avg,attempts:results.length});
}
export function getAllQuizResults(req:Request,res:Response):void{
  const limit=qsInt(req.query['limit'],100);const offset=qsInt(req.query['offset'],0);
  res.json({results:dbAll(`SELECT qr.*,u.username,u.email FROM quiz_results qr JOIN users u ON qr.user_id=u.id ORDER BY qr.completed_at DESC LIMIT ? OFFSET ?`,[limit,offset])});
}
export function completeModule(req:Request,res:Response,next:NextFunction):void{
  try{
    const{moduleId}=req.body as{moduleId:string};const userId=req.user.sub;
    const existing=dbGet<{id:string;completed:number}>('SELECT id,completed FROM module_progress WHERE user_id=? AND module_id=?',[userId,moduleId]);
    if(existing?.completed){res.json({message:'Already completed',xpEarned:0,newBadges:[]});return;}
    if(existing)dbRun(`UPDATE module_progress SET completed=1,xp_earned=?,completed_at=datetime('now') WHERE id=?`,[MODULE_XP,existing.id]);
    else dbRun(`INSERT INTO module_progress(id,user_id,module_id,completed,xp_earned,completed_at)VALUES(?,?,?,1,?,datetime('now'))`,[uuidv4(),userId,moduleId,MODULE_XP]);
    dbRun(`UPDATE users SET xp=xp+?,last_active=datetime('now'),updated_at=datetime('now') WHERE id=?`,[MODULE_XP,userId]);
    audit(userId,'MODULE_COMPLETE',{moduleId,xpEarned:MODULE_XP},req.ip??null);
    res.json({message:'Module completed',xpEarned:MODULE_XP,newBadges:checkAndAwardBadges(userId)});
  }catch(err){next(err);}
}
export function getMyModuleProgress(req:Request,res:Response):void{
  res.json({progress:dbAll('SELECT module_id,completed,xp_earned,completed_at FROM module_progress WHERE user_id=?',[req.user.sub])});
}
export function getUsers(req:Request,res:Response):void{
  const search=qs(req.query['search']);const role=qs(req.query['role']);const department=qs(req.query['department']);
  const limit=qsInt(req.query['limit'],50);const offset=qsInt(req.query['offset'],0);
  let sql=`SELECT id,email,username,role,department,xp,streak,is_active,last_active,created_at FROM users WHERE 1=1`;const p:unknown[]=[];
  if(search){sql+=` AND (username LIKE ? OR email LIKE ?)`;p.push(`%${search}%`,`%${search}%`);}
  if(role){sql+=` AND role=?`;p.push(role);}if(department){sql+=` AND department=?`;p.push(department);}
  sql+=` ORDER BY created_at DESC LIMIT ? OFFSET ?`;p.push(limit,offset);
  const total=(dbGet<{c:number}>('SELECT COUNT(*)as c FROM users')??{c:0}).c;
  res.json({users:dbAll(sql,p),total,limit,offset});
}
export function getAdminUser(req:Request,res:Response):void{
  const id=param(req.params['id']);
  const user=dbGet<Omit<User,'password'>>('SELECT id,email,username,role,department,xp,streak,is_active,last_active,created_at FROM users WHERE id=?',[id]);
  if(!user){res.status(404).json({error:'User not found'});return;}
  res.json({user,stats:computeStats(id)});
}
export function updateAdminUser(req:Request,res:Response,next:NextFunction):void{
  try{
    const id=param(req.params['id']);
    const{role,department,is_active}=req.body as{role?:string;department?:string;is_active?:boolean};
    if(!dbGet('SELECT id FROM users WHERE id=?',[id])){res.status(404).json({error:'User not found'});return;}
    if(role!==undefined)dbRun('UPDATE users SET role=? WHERE id=?',[role,id]);
    if(department!==undefined)dbRun('UPDATE users SET department=? WHERE id=?',[department,id]);
    if(is_active!==undefined){dbRun('UPDATE users SET is_active=? WHERE id=?',[is_active?1:0,id]);if(!is_active)revokeAllUserTokens(id);}
    audit(req.user.sub,'ADMIN_UPDATE_USER',{targetUserId:id},req.ip??null);
    res.json({user:dbGet('SELECT id,email,username,role,department,xp,streak,is_active FROM users WHERE id=?',[id])});
  }catch(err){next(err);}
}
export function deleteAdminUser(req:Request,res:Response,next:NextFunction):void{
  try{
    const id=param(req.params['id']);
    if(id===req.user.sub){res.status(400).json({error:'Cannot delete your own account'});return;}
    const user=dbGet<{email:string}>('SELECT email FROM users WHERE id=?',[id]);
    if(!user){res.status(404).json({error:'User not found'});return;}
    revokeAllUserTokens(id);dbRun('DELETE FROM users WHERE id=?',[id]);
    audit(req.user.sub,'ADMIN_DELETE_USER',{targetUserId:id,email:user.email},req.ip??null);
    res.json({message:'User deleted'});
  }catch(err){next(err);}
}
export function getOrgStats(_req:Request,res:Response):void{
  const totalUsers=(dbGet<{c:number}>('SELECT COUNT(*)as c FROM users WHERE is_active=1')??{c:0}).c;
  const totalSims=(dbGet<{c:number}>('SELECT COUNT(*)as c FROM scenario_results')??{c:0}).c;
  const totalQuizzes=(dbGet<{c:number}>('SELECT COUNT(*)as c FROM quiz_results')??{c:0}).c;
  const avgQuizPct=(dbGet<{avg:number}>('SELECT ROUND(AVG(pct))as avg FROM quiz_results')??{avg:0}).avg;
  res.json({overview:{totalUsers,totalSims,totalQuizzes,avgQuizPct},simsByCategory:dbAll(`SELECT category,COUNT(*)as attempts,SUM(passed)as passes,ROUND(AVG(passed)*100)as pass_rate FROM scenario_results GROUP BY category ORDER BY pass_rate ASC`),topUsers:dbAll(`SELECT u.username,u.department,u.xp,(SELECT COUNT(*)FROM scenario_results sr WHERE sr.user_id=u.id AND sr.passed=1)as sims_passed FROM users u WHERE u.is_active=1 ORDER BY u.xp DESC LIMIT 5`)});
}
export function getAuditLog(req:Request,res:Response):void{
  const userId=qs(req.query['userId']);const action=qs(req.query['action']);
  const limit=qsInt(req.query['limit'],100);const offset=qsInt(req.query['offset'],0);
  let sql=`SELECT al.*,u.username FROM audit_log al LEFT JOIN users u ON al.user_id=u.id WHERE 1=1`;const p:unknown[]=[];
  if(userId){sql+=' AND al.user_id=?';p.push(userId);}if(action){sql+=' AND al.action=?';p.push(action);}
  sql+=' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';p.push(limit,offset);
  interface LR{detail:string|null}
  res.json({logs:dbAll<LR>(sql,p).map(l=>({...l,detail:l.detail?JSON.parse(l.detail) as unknown:null}))});
}
