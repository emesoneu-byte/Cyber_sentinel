import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppShell from './components/layout/AppShell';
import { AuthPage, DashboardPage, CoachPage, LeaderboardPage } from './pages/index';
import LearnPage from './pages/LearnPage';
import QuizPage from './pages/QuizPage';
import SimulationsPage from './pages/SimulationsPage';
import AdminPage from './pages/AdminPage';
import ProfilePage from './pages/ProfilePage';
import AboutPage from './pages/AboutPage';
import { moduleApi, simApi, quizApi } from './api/client';

function Inner() {
  const { isAuthenticated, isLoading, refreshUser, user } = useAuth();
  const [completedModules, setCompletedModules] = useState<string[]>([]);
  const [simResults, setSimResults] = useState<Record<number, boolean>>({});
  const [progressUserId, setProgressUserId] = useState<string | null>(null);

  // Load (or clear) per-user progress whenever auth user changes
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setCompletedModules([]);
      setSimResults({});
      setProgressUserId(null);
      return;
    }
    if (progressUserId === user.id) return; // already loaded for this user
    let cancelled = false;
    setCompletedModules([]);
    setSimResults({});
    Promise.all([moduleApi.progress(), simApi.myResults()])
      .then(([modRes, simRes]) => {
        if (cancelled) return;
        setCompletedModules(modRes.progress.filter(p => p.completed).map(p => p.module_id));
        const map: Record<number, boolean> = {};
        simRes.results.forEach(r => { map[r.scenario_id] = Boolean(r.passed); });
        setSimResults(map);
        setProgressUserId(user.id);
      })
      .catch(() => {
        if (!cancelled) setProgressUserId(user.id);
      });
    return () => { cancelled = true; };
  }, [isAuthenticated, user?.id, progressUserId]);

  const handleModuleComplete = (moduleId: string) => {
    setCompletedModules(prev => prev.includes(moduleId) ? prev : [...prev, moduleId]);
    refreshUser();
  };

  const handleSimResult = (id: number, passed: boolean) => {
    setSimResults(prev => ({ ...prev, [id]: passed }));
    refreshUser();
  };

  if (isLoading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--cs-bg)', fontFamily:'var(--font-sans)' }}>
      <div style={{ textAlign:'center' }} className="cs-fade-in">
        <div style={{ width:56, height:56, borderRadius:14, background:'linear-gradient(135deg,#2563EB,#06B6D4)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', boxShadow:'0 8px 24px rgba(37,99,235,.35)' }}>
          <i className="ti ti-shield-check" style={{ fontSize:28, color:'#fff' }} aria-hidden="true"/>
        </div>
        <div style={{ fontSize:16, fontWeight:700, color:'var(--cs-text)', marginBottom:4 }}>CyberSentinel</div>
        <div style={{ fontSize:12, color:'var(--cs-muted)', letterSpacing:'0.08em', fontWeight:500, marginBottom:16 }}>LEARN · DETECT · DEFEND</div>
        <div style={{ width:28, height:28, border:'3px solid var(--cs-border)', borderTopColor:'var(--cs-primary)', borderRadius:'50%', margin:'0 auto', animation:'csSpin .7s linear infinite' }} />
      </div>
    </div>
  );

  if (!isAuthenticated) return <AuthPage />;

  return (
    <AppShell>
      {(page, setPage) => {
        switch (page) {
          case 'dashboard':   return <DashboardPage key={'d'+Object.keys(simResults).length+(user?.xp??0)} onNavigate={setPage} />;
          case 'learn':       return <LearnPage completedModules={completedModules} onComplete={handleModuleComplete} />;
          case 'simulations': return <SimulationsPage completedResults={simResults} onResult={handleSimResult} />;
          case 'quiz':        return <QuizPage />;
          case 'coach':       return <CoachPage />;
          case 'report':      return <ReportPage key={Object.keys(simResults).length} />;
          case 'leaderboard': return <LeaderboardPage />;
          case 'profile':     return <ProfilePage />;
          case 'about':       return <AboutPage />;
          case 'admin':       return <AdminPage />;
          default:            return <DashboardPage onNavigate={setPage} />;
        }
      }}
    </AppShell>
  );
}

function ReportPage() {
  const { user } = useAuth();
  const [simData, setSimData] = useState<{ results: Array<{scenario_id:number;category:string;difficulty:string;passed:number;xp_earned:number}>; summary: {total:number;passed:number;passRate:number;byCategory:Record<string,{total:number;passed:number}>} } | null>(null);
  const [qData, setQData]   = useState<{best:number|null;avg:number|null;attempts:number}|null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([simApi.myResults(), quizApi.history()])
      .then(([s, q]) => { setSimData(s); setQData(q); })
      .finally(() => setLoading(false));
  }, []);

  const s = (style: React.CSSProperties = {}) => ({ fontFamily:'var(--font-sans)', ...style });
  const card: React.CSSProperties = { background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)', padding:'16px 18px', marginBottom:14 };

  if (loading) return <div style={s({padding:40,textAlign:'center',color:'var(--color-text-secondary)'})}>Loading…</div>;

  const cats = ['phishing','vishing','smishing','pretexting','baiting','physical','deepfake'];
  const catLabels: Record<string,string> = { phishing:'Phishing', vishing:'Vishing', smishing:'Smishing', pretexting:'Pretexting', baiting:'Baiting', physical:'Physical', deepfake:'Deepfake' };
  const catData = cats.map(cat => {
    const c = simData?.summary.byCategory[cat];
    return { cat, total:c?.total??0, passed:c?.passed??0, passRate:c&&c.total>0?Math.round((c.passed/c.total)*100):null };
  });
  const pct = simData?.summary.passRate ?? 0;
  const riskColor = pct>=75?'var(--color-text-success)':pct>=50?'var(--color-text-warning)':'var(--color-text-danger)';
  const weakest = [...catData].filter(c=>c.passRate!==null).sort((a,b)=>(a.passRate??100)-(b.passRate??100))[0];
  const strongest = [...catData].filter(c=>c.passRate!==null).sort((a,b)=>(b.passRate??0)-(a.passRate??0))[0];
  const chartMax = 100;

  return (
    <div style={s()}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:2,flexWrap:'wrap',gap:8}}>
        <div style={{fontSize:17,fontWeight:600}}>My security report</div>
        <button onClick={()=>window.print()} style={{padding:'6px 12px',fontSize:12,cursor:'pointer',border:'0.5px solid var(--color-border-secondary)',background:'var(--color-background-primary)',borderRadius:'var(--border-radius-md)',fontFamily:'var(--font-sans)',color:'var(--color-text-primary)'}}><i className="ti ti-printer"/> Print / Export</button>
      </div>
      <div style={{fontSize:12,color:'var(--color-text-secondary)',marginBottom:16}}>Personal threat resistance analysis for {user?.username}</div>

      <div className="cs-grid-4" style={{marginBottom:14}}>
        {[
          {label:'Overall pass rate',value:`${pct}%`,color:riskColor,sub:`${simData?.summary.total??0} simulations`},
          {label:'Risk level',value:pct>=75?'Low':pct>=50?'Medium':'High',color:riskColor,sub:'based on sims'},
          {label:'Best quiz',value:`${qData?.best??0}%`,color:'var(--color-text-info)',sub:`${qData?.attempts??0} attempt(s)`},
        ].map(st=>(
          <div key={st.label} style={{background:'var(--color-background-secondary)',borderRadius:'var(--border-radius-md)',padding:'12px 14px'}}>
            <div style={{fontSize:11,color:'var(--color-text-secondary)'}}>{st.label}</div>
            <div style={{fontSize:22,fontWeight:600,color:st.color,marginTop:4}}>{st.value}</div>
            <div style={{fontSize:11,color:'var(--color-text-tertiary)',marginTop:2}}>{st.sub}</div>
          </div>
        ))}
      </div>

      <div className="cs-grid-2-lg" style={{marginBottom:14}}>
        <div style={card}>
          <div style={{fontSize:13,fontWeight:500,marginBottom:12}}>Pass rate by category</div>
          <div style={{display:'flex',alignItems:'flex-end',gap:8,height:140,paddingTop:8}}>
            {catData.map(c => {
              const h = c.passRate==null ? 4 : Math.max(6, (c.passRate/chartMax)*120);
              const barColor = c.passRate==null ? 'var(--color-border-tertiary)' : c.passRate>=70 ? 'var(--color-text-success)' : c.passRate>=40 ? 'var(--color-text-warning)' : 'var(--color-text-danger)';
              return (
                <div key={c.cat} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4,height:'100%',justifyContent:'flex-end'}}>
                  <div style={{fontSize:10,fontWeight:600,color:barColor}}>{c.passRate==null?'—':`${c.passRate}%`}</div>
                  <div style={{width:'100%',maxWidth:36,height:h,background:barColor,borderRadius:'4px 4px 0 0',opacity:0.85}} title={`${catLabels[c.cat]}: ${c.passed}/${c.total}`} />
                  <div style={{fontSize:9,color:'var(--color-text-tertiary)',textAlign:'center',lineHeight:1.2}}>{catLabels[c.cat].slice(0,4)}</div>
                </div>
              );
            })}
          </div>
          <div style={{fontSize:11,color:'var(--color-text-tertiary)',marginTop:10}}>Green ≥70% · Amber 40–69% · Red &lt;40%</div>
        </div>

        <div style={card}>
          <div style={{fontSize:13,fontWeight:500,marginBottom:12}}>Overall score</div>
          <div style={{display:'flex',justifyContent:'center',marginBottom:12}}>
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="var(--color-border-tertiary)" strokeWidth="10" />
              <circle cx="60" cy="60" r="50" fill="none" stroke={riskColor} strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${2*Math.PI*50}`} strokeDashoffset={`${2*Math.PI*50*(1-pct/100)}`} transform="rotate(-90 60 60)" />
              <text x="60" y="56" textAnchor="middle" style={{fontSize:22,fontWeight:700,fill:'var(--color-text-primary)'}}>{pct}%</text>
              <text x="60" y="74" textAnchor="middle" style={{fontSize:10,fill:'var(--color-text-secondary)'}}>pass rate</text>
            </svg>
          </div>
          {strongest&&strongest.passRate!=null && (
            <div style={{fontSize:12,marginBottom:6}}><span style={{color:'var(--color-text-secondary)'}}>Strongest:</span> <strong style={{textTransform:'capitalize'}}>{strongest.cat}</strong> ({strongest.passRate}%)</div>
          )}
          {weakest&&weakest.passRate!=null && (
            <div style={{fontSize:12}}><span style={{color:'var(--color-text-secondary)'}}>Weakest:</span> <strong style={{textTransform:'capitalize'}}>{weakest.cat}</strong> ({weakest.passRate}%)</div>
          )}
        </div>
      </div>

      <div style={card}>
        <div style={{fontSize:13,fontWeight:500,marginBottom:10}}>Category breakdown</div>
        {catData.map(c=>(
          <div key={c.cat} style={{marginBottom:10}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:3}}>
              <span style={{textTransform:'capitalize',fontWeight:500}}>{c.cat}</span>
              <span style={{color:'var(--color-text-secondary)'}}>{c.passed}/{c.total} passed {c.passRate!=null?`· ${c.passRate}%`:''}</span>
            </div>
            <div style={{height:8,background:'var(--color-border-tertiary)',borderRadius:4,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${c.passRate??0}%`,background:c.passRate==null?'transparent':c.passRate>=70?'var(--color-text-success)':c.passRate>=40?'var(--color-text-warning)':'var(--color-text-danger)',borderRadius:4,transition:'width .3s'}} />
            </div>
          </div>
        ))}
      </div>

      <div style={card}>
        <div style={{fontSize:13,fontWeight:500,marginBottom:10}}>Recommendations</div>
        {weakest&&weakest.passRate!==null&&weakest.passRate<70&&(
          <div style={{background:'var(--color-background-danger)',border:'0.5px solid var(--color-border-danger)',borderRadius:'var(--border-radius-md)',padding:'10px 14px',fontSize:12,color:'var(--color-text-danger)',marginBottom:8}}>
            <strong>Priority:</strong> Weakest area is <strong style={{textTransform:'capitalize'}}>{weakest.cat}</strong> at {weakest.passRate}% pass rate. Open the <strong style={{textTransform:'capitalize'}}>{weakest.cat}</strong> simulation section and practise those scenarios.
          </div>
        )}
        {(qData?.best??0)<70&&(
          <div style={{background:'var(--color-background-warning)',border:'0.5px solid var(--color-border-warning)',borderRadius:'var(--border-radius-md)',padding:'10px 14px',fontSize:12,color:'var(--color-text-warning)',marginBottom:8}}>
            Best quiz score is {qData?.best??0}%. Aim for 70%+ — review the Learning Hub modules first.
          </div>
        )}
        {(simData?.summary.total??0)===0&&(
          <div style={{background:'var(--color-background-info)',border:'0.5px solid var(--color-border-info)',borderRadius:'var(--border-radius-md)',padding:'10px 14px',fontSize:12,color:'var(--color-text-info)'}}>
            No simulations completed yet. Go to the Simulations tab to build your profile.
          </div>
        )}
        {pct>=75&&(simData?.summary.total??0)>0&&(
          <div style={{background:'var(--color-background-success)',border:'0.5px solid var(--color-border-success)',borderRadius:'var(--border-radius-md)',padding:'10px 14px',fontSize:12,color:'var(--color-text-success)'}}>
            Excellent! {pct}% pass rate. Try harder difficulty scenarios to push further.
          </div>
        )}
      </div>

      <div style={card}>
        <div style={{fontSize:13,fontWeight:500,marginBottom:10}}>Recent activity</div>
        {(simData?.results.length??0)===0
          ?<div style={{fontSize:12,color:'var(--color-text-secondary)'}}>No simulations yet.</div>
          :(simData?.results.slice(0,8)??[]).map((r,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 0',borderBottom:'0.5px solid var(--color-border-tertiary)',fontSize:12}}>
              <span style={{background:r.passed?'var(--color-background-success)':'var(--color-background-danger)',color:r.passed?'var(--color-text-success)':'var(--color-text-danger)',fontSize:10,padding:'2px 8px',borderRadius:20,fontWeight:500,flexShrink:0}}>{r.passed?'Pass':'Fail'}</span>
              <span style={{flex:1,textTransform:'capitalize'}}>{r.category} #{r.scenario_id}</span>
              <span style={{color:'var(--color-text-secondary)',fontSize:10}}>{r.difficulty}</span>
              <span style={{color:'var(--color-text-info)',fontSize:11,fontWeight:500}}>+{r.xp_earned} XP</span>
            </div>
          ))
        }
      </div>
    </div>
  );
}

export default function App() {
  return <AuthProvider><Inner /></AuthProvider>;
}
