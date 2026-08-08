import{v4 as uuidv4}from'uuid';
import{dbRun,dbGet,dbAll}from'../database';
import type{BadgeDefinition,BadgeView,UserStats}from'../types';
export const BADGE_DEFINITIONS:BadgeDefinition[]=[
  {id:'first_sim',label:'First Responder',desc:'Completed your first simulation',icon:'ti-shield',check:(s)=>s.totalSims>=1},
  {id:'sim_10',label:'Security Cadet',desc:'Completed 10 simulations',icon:'ti-shield-half',check:(s)=>s.totalSims>=10},
  {id:'sim_30',label:'SE Expert',desc:'Completed all 30 simulations',icon:'ti-shield-check',check:(s)=>s.totalSims>=30},
  {id:'pass_streak_5',label:'On Fire',desc:'5 passes in a row',icon:'ti-flame',check:(s)=>s.streak>=5},
  {id:'perfect_run',label:'Perfect Run',desc:'10 consecutive passes',icon:'ti-trophy',check:(s)=>s.streak>=10},
  {id:'phish_hunter',label:'Phish Hunter',desc:'Passed 5 phishing simulations',icon:'ti-mail-opened',check:(s)=>s.phishingPassed>=5},
  {id:'vishing_pro',label:'Call Screener',desc:'Passed 5 vishing simulations',icon:'ti-phone-off',check:(s)=>s.vishingPassed>=5},
  {id:'smish_aware',label:'Smish Aware',desc:'Passed 5 smishing simulations',icon:'ti-message-off',check:(s)=>s.smishingPassed>=5},
  {id:'deepfake_det',label:'Deepfake Detector',desc:'Passed 3 deepfake simulations',icon:'ti-robot-off',check:(s)=>s.deepfakePassed>=3},
  {id:'quiz_pass',label:'Knowledge Verified',desc:'Quiz score 70%+',icon:'ti-brain',check:(s)=>s.bestQuizPct>=70},
  {id:'quiz_ace',label:'Quiz Master',desc:'Quiz score 100%',icon:'ti-certificate',check:(s)=>s.bestQuizPct>=100},
  {id:'all_modules',label:'Scholar',desc:'All 7 modules completed',icon:'ti-book',check:(s)=>s.modulesCompleted>=7},
  {id:'xp_500',label:'XP Grinder',desc:'Earned 500 XP',icon:'ti-star',check:(s)=>s.xp>=500},
];
export function computeStats(userId:string):UserStats{
  interface SR{category:string;passed:number}
  interface QR{pct:number}
  const sims=dbAll<SR>('SELECT category,passed FROM scenario_results WHERE user_id=?',[userId]);
  const quizzes=dbAll<QR>('SELECT pct FROM quiz_results WHERE user_id=?',[userId]);
  const modules=dbAll('SELECT 1 FROM module_progress WHERE user_id=? AND completed=1',[userId]);
  const user=dbGet<{xp:number;streak:number}>('SELECT xp,streak FROM users WHERE id=?',[userId]);
  const byC=(cat:string)=>sims.filter(s=>s.category===cat&&s.passed===1).length;
  return{totalSims:sims.length,streak:user?.streak??0,xp:user?.xp??0,modulesCompleted:modules.length,phishingPassed:byC('phishing'),vishingPassed:byC('vishing'),smishingPassed:byC('smishing'),pretextingPassed:byC('pretexting'),deepfakePassed:byC('deepfake'),baitingPassed:byC('baiting'),physicalPassed:byC('physical'),bestQuizPct:quizzes.length>0?Math.max(...quizzes.map(q=>q.pct)):0};
}
export function checkAndAwardBadges(userId:string):BadgeView[]{
  const stats=computeStats(userId);
  const existing=new Set(dbAll<{badge_id:string}>('SELECT badge_id FROM user_badges WHERE user_id=?',[userId]).map(r=>r.badge_id));
  const awarded:BadgeView[]=[];
  for(const def of BADGE_DEFINITIONS){
    if(!existing.has(def.id)&&def.check(stats)){
      dbRun('INSERT OR IGNORE INTO user_badges(id,user_id,badge_id)VALUES(?,?,?)',[uuidv4(),userId,def.id]);
      awarded.push({id:def.id,label:def.label,desc:def.desc,icon:def.icon,earned:true,earnedAt:new Date().toISOString()});
    }
  }
  return awarded;
}
export function getUserBadges(userId:string):BadgeView[]{
  const earned=dbAll<{badge_id:string;earned_at:string}>('SELECT badge_id,earned_at FROM user_badges WHERE user_id=?',[userId]);
  const map=new Map(earned.map(b=>[b.badge_id,b.earned_at]));
  return BADGE_DEFINITIONS.map(def=>({id:def.id,label:def.label,desc:def.desc,icon:def.icon,earned:map.has(def.id),earnedAt:map.get(def.id)??null}));
}
