import{Request,Response,NextFunction}from'express';
import{v4 as uuidv4}from'uuid';
import{dbRun,dbGet,dbAll}from'../database';
import{checkAndAwardBadges}from'../utils/badges';
import{audit}from'../utils/audit';
import{qs,qsInt,param}from'../utils/qs';
import{XP_TABLE}from'../types';
import type{ScenarioResultBody,ScenarioResult}from'../types';
export function submitResult(req:Request<object,object,ScenarioResultBody>,res:Response,next:NextFunction):void{
  try{
    const{scenarioId,category,difficulty,passed,chosen,timeTaken}=req.body;const userId=req.user.sub;
    // XP only for a correct answer, and only the first time the user passes this scenario
    const existing=dbGet<ScenarioResult>('SELECT id,passed,xp_earned FROM scenario_results WHERE user_id=? AND scenario_id=?',[userId,scenarioId]);
    const passXp=XP_TABLE[difficulty].pass;
    let xpEarned=0;
    if(passed){
      if(!existing)xpEarned=passXp;           // first attempt, correct
      else if(!existing.passed)xpEarned=passXp; // previously failed, now correct
      // already passed before → 0 XP on retry
    }
    // fail always awards 0 XP
    if(existing)dbRun(`UPDATE scenario_results SET passed=?,chosen=?,xp_earned=?,time_taken=?,completed_at=datetime('now') WHERE id=?`,[passed?1:0,chosen,existing.passed?existing.xp_earned:xpEarned,timeTaken??null,existing.id]);
    else dbRun('INSERT INTO scenario_results(id,user_id,scenario_id,category,difficulty,passed,chosen,xp_earned,time_taken)VALUES(?,?,?,?,?,?,?,?,?)',[uuidv4(),userId,scenarioId,category,difficulty,passed?1:0,chosen,xpEarned,timeTaken??null]);
    const user=dbGet<{streak:number}>('SELECT streak FROM users WHERE id=?',[userId]);
    const newStreak=passed?(user?.streak??0)+1:0;
    if(xpEarned>0)dbRun(`UPDATE users SET xp=xp+?,streak=?,last_active=datetime('now'),updated_at=datetime('now') WHERE id=?`,[xpEarned,newStreak,userId]);
    else dbRun(`UPDATE users SET streak=?,last_active=datetime('now'),updated_at=datetime('now') WHERE id=?`,[newStreak,userId]);
    audit(userId,'SCENARIO_SUBMIT',{scenarioId,category,passed,xpEarned},req.ip??null);
    res.json({xpEarned,newStreak,newBadges:checkAndAwardBadges(userId),message:passed?(xpEarned>0?'Correct!':'Correct — already completed.'):'Incorrect — review the feedback. No XP awarded.'});
  }catch(err){next(err);}
}
export function getMyResults(req:Request,res:Response):void{
  const results=dbAll<ScenarioResult>('SELECT scenario_id,category,difficulty,passed,chosen,xp_earned,time_taken,completed_at FROM scenario_results WHERE user_id=? ORDER BY completed_at DESC',[req.user.sub]);
  const total=results.length;const passed=results.filter(r=>r.passed).length;
  const byCategory:Record<string,{total:number;passed:number}>={};
  results.forEach(r=>{if(!byCategory[r.category])byCategory[r.category]={total:0,passed:0};byCategory[r.category].total++;if(r.passed)byCategory[r.category].passed++;});
  res.json({results,summary:{total,passed,passRate:total>0?Math.round((passed/total)*100):0,byCategory}});
}
export function getMyResultByScenario(req:Request,res:Response):void{
  const scenarioId=parseInt(param(req.params['scenarioId']),10);
  res.json({result:dbGet('SELECT * FROM scenario_results WHERE user_id=? AND scenario_id=?',[req.user.sub,scenarioId])??null});
}
export function getScenarioStats(_req:Request,res:Response):void{
  res.json({stats:dbAll(`SELECT scenario_id,category,difficulty,COUNT(*)as attempts,SUM(passed)as passes,ROUND(AVG(passed)*100)as pass_rate FROM scenario_results GROUP BY scenario_id ORDER BY scenario_id ASC`)});
}
export function getAllResults(req:Request,res:Response):void{
  const category=qs(req.query['category']);const difficulty=qs(req.query['difficulty']);const passedQ=qs(req.query['passed']);
  const limit=qsInt(req.query['limit'],100);const offset=qsInt(req.query['offset'],0);
  let sql=`SELECT sr.*,u.username,u.email FROM scenario_results sr JOIN users u ON sr.user_id=u.id WHERE 1=1`;const p:unknown[]=[];
  if(category){sql+=' AND sr.category=?';p.push(category);}if(difficulty){sql+=' AND sr.difficulty=?';p.push(difficulty);}
  if(passedQ!==undefined){sql+=' AND sr.passed=?';p.push(passedQ==='true'?1:0);}
  sql+=' ORDER BY sr.completed_at DESC LIMIT ? OFFSET ?';p.push(limit,offset);
  res.json({results:dbAll(sql,p)});
}
