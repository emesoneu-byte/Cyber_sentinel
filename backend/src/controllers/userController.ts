import{Request,Response,NextFunction}from'express';
import bcrypt from'bcryptjs';
import{dbGet,dbAll,dbRun}from'../database';
import{getUserBadges,computeStats}from'../utils/badges';
import{audit}from'../utils/audit';
import{qsInt,param}from'../utils/qs';
import type{User}from'../types';
export function getMe(req:Request,res:Response):void{
  const user=dbGet<Omit<User,'password'>>('SELECT id,email,username,role,department,xp,streak,last_active,created_at FROM users WHERE id=?',[req.user.sub]);
  if(!user){res.status(404).json({error:'User not found'});return;}res.json({user});
}
export function getProfile(req:Request,res:Response):void{
  const userId=param(req.params['id'])||req.user.sub;
  const user=dbGet<Omit<User,'password'>>('SELECT id,username,role,department,xp,streak,created_at FROM users WHERE id=? AND is_active=1',[userId]);
  if(!user){res.status(404).json({error:'User not found'});return;}
  res.json({user,stats:computeStats(userId),badges:getUserBadges(userId),recentActivity:dbAll('SELECT scenario_id,category,difficulty,passed,xp_earned,completed_at FROM scenario_results WHERE user_id=? ORDER BY completed_at DESC LIMIT 10',[userId])});
}
export async function updateProfile(req:Request,res:Response,next:NextFunction):Promise<void>{
  try{
    const{department,currentPassword,newPassword}=req.body as{department?:string;currentPassword?:string;newPassword?:string};
    const userId=req.user.sub;const user=dbGet<User>('SELECT * FROM users WHERE id=?',[userId])!;
    if(newPassword){
      if(!currentPassword){res.status(400).json({error:'currentPassword required'});return;}
      if(!await bcrypt.compare(currentPassword,user.password)){res.status(401).json({error:'Current password incorrect'});return;}
      dbRun(`UPDATE users SET password=?,updated_at=datetime('now') WHERE id=?`,[await bcrypt.hash(newPassword,12),userId]);
      audit(userId,'PASSWORD_CHANGE',null,req.ip??null);
    }
    if(department!==undefined)dbRun(`UPDATE users SET department=?,updated_at=datetime('now') WHERE id=?`,[department,userId]);
    res.json({user:dbGet<Omit<User,'password'>>('SELECT id,email,username,role,department,xp,streak FROM users WHERE id=?',[userId])});
  }catch(err){next(err);}
}
export function getDashboard(req:Request,res:Response):void{
  const userId=req.user.sub;
  const user=dbGet<{xp:number;streak:number}>('SELECT xp,streak FROM users WHERE id=?',[userId]);
  interface CR{category:string;total:number;passed_count:number}
  const cats=dbAll<CR>(`SELECT category,COUNT(*)as total,SUM(passed)as passed_count FROM scenario_results WHERE user_id=? GROUP BY category`,[userId]);
  res.json({xp:user?.xp??0,streak:user?.streak??0,stats:computeStats(userId),vulnProfile:cats.map(c=>({category:c.category,total:c.total,passed:c.passed_count,passRate:c.total>0?Math.round((c.passed_count/c.total)*100):null,vulnScore:c.total>0?Math.round(((c.total-c.passed_count)/c.total)*100):null})),badges:getUserBadges(userId).filter(b=>b.earned),recentQuizzes:dbAll('SELECT score,total,pct,completed_at FROM quiz_results WHERE user_id=? ORDER BY completed_at DESC LIMIT 5',[userId]),recentSims:dbAll('SELECT scenario_id,category,difficulty,passed,xp_earned,completed_at FROM scenario_results WHERE user_id=? ORDER BY completed_at DESC LIMIT 5',[userId])});
}
export function getLeaderboard(req:Request,res:Response):void{
  const limit=Math.min(qsInt(req.query['limit'],20),50);
  res.json({leaderboard:dbAll(`SELECT u.id,u.username,u.department,u.xp,u.streak,(SELECT COUNT(*)FROM scenario_results sr WHERE sr.user_id=u.id AND sr.passed=1)as sims_passed,(SELECT COUNT(*)FROM user_badges ub WHERE ub.user_id=u.id)as badge_count FROM users u WHERE u.is_active=1 ORDER BY u.xp DESC LIMIT ?`,[limit]).map((r,i)=>({rank:i+1,...r}))});
}
