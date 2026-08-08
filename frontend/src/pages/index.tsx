// ── AuthPage ──────────────────────────────────────────────────────
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDashboard, useSimResults, useQuizHistory, useModuleProgress, useLeaderboard } from '../hooks';
import { coachApi, type CoachMessage } from '../api/coach';
import { useEffect, useRef, useCallback } from 'react';

export function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login'|'register'>('login');
  const [form, setForm] = useState({email:'',username:'',password:'',department:''});
  const [error, setError] = useState('');
  const [coachMode, setCoachMode] = useState<'live'|'offline'|null>(null);
  const [loading, setLoading] = useState(false);
  const set = (k:string,v:string) => setForm(f=>({...f,[k]:v}));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try { mode==='login' ? await login(form.email,form.password) : await register(form.email,form.username,form.password,form.department||undefined); }
    catch(err){ setError((err as Error).message); } finally { setLoading(false); }
  };
  const inp = {width:'100%',padding:'8px 12px',fontSize:13,border:'0.5px solid var(--color-border-secondary)',borderRadius:'var(--border-radius-md)',background:'var(--color-background-primary)',color:'var(--color-text-primary)',fontFamily:'var(--font-sans)'};
  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--cs-bg)',fontFamily:'var(--font-sans)'}}>
      <div style={{width:380,background:'var(--cs-card)',border:'1px solid var(--cs-border)',borderRadius:'var(--cs-radius-lg)',padding:'28px 28px 24px',boxShadow:'var(--cs-shadow-md)'}}>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',marginBottom:22,textAlign:'center'}}>
          <div style={{width:48,height:48,borderRadius:12,background:'linear-gradient(135deg,#2563EB,#06B6D4)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:12,boxShadow:'0 6px 16px rgba(37,99,235,.3)'}}>
            <i className="ti ti-shield-check" style={{fontSize:24,color:'#fff'}} aria-hidden="true"/>
          </div>
          <div style={{fontSize:18,fontWeight:700,color:'var(--cs-text)',letterSpacing:'-0.02em'}}>CyberSentinel</div>
          <div style={{fontSize:11,color:'var(--cs-muted)',fontWeight:600,letterSpacing:'0.1em',marginTop:4}}>LEARN · DETECT · DEFEND</div>
        </div>
        <div style={{display:'flex',gap:0,borderBottom:'0.5px solid var(--color-border-tertiary)',marginBottom:20}}>
          {(['login','register'] as const).map(m=>(
            <button key={m} onClick={()=>{setMode(m);setError('');}} style={{flex:1,padding:'8px 0',fontSize:13,cursor:'pointer',border:'none',borderBottom:`2px solid ${mode===m?'var(--color-text-primary)':'transparent'}`,background:'none',color:mode===m?'var(--color-text-primary)':'var(--color-text-secondary)',fontWeight:mode===m?500:400,fontFamily:'var(--font-sans)'}}>
              {m==='login'?'Sign in':'Create account'}
            </button>
          ))}
        </div>
        {error&&<div style={{background:'var(--color-background-danger)',color:'var(--color-text-danger)',border:'0.5px solid var(--color-border-danger)',borderRadius:'var(--border-radius-md)',padding:'8px 12px',fontSize:12,marginBottom:14}}>{error}</div>}
          {mode==='login'&&<div style={{background:'var(--color-background-info)',color:'var(--color-text-info)',borderRadius:'var(--border-radius-md)',padding:'8px 12px',fontSize:11,marginBottom:12,lineHeight:1.5}}>
            <strong>Demo admin:</strong> admin@example.com &nbsp;/&nbsp; Admin123!
          </div>}
        <form onSubmit={submit} style={{display:'flex',flexDirection:'column',gap:12}}>
          <div><label style={{display:'block',fontSize:11,fontWeight:500,color:'var(--color-text-secondary)',marginBottom:4}}>Email</label><input type="email" value={form.email} onChange={e=>set('email',e.target.value)} required placeholder="you@company.com" style={inp}/></div>
          {mode==='register'&&<div><label style={{display:'block',fontSize:11,fontWeight:500,color:'var(--color-text-secondary)',marginBottom:4}}>Username</label><input type="text" value={form.username} onChange={e=>set('username',e.target.value)} required placeholder="john_doe" style={inp}/></div>}
          <div><label style={{display:'block',fontSize:11,fontWeight:500,color:'var(--color-text-secondary)',marginBottom:4}}>Password</label><input type="password" value={form.password} onChange={e=>set('password',e.target.value)} required placeholder={mode==='register'?'Min 8 chars, 1 uppercase, 1 number':'••••••••'} style={inp}/></div>
          {mode==='register'&&<div><label style={{display:'block',fontSize:11,fontWeight:500,color:'var(--color-text-secondary)',marginBottom:4}}>Department (optional)</label><input type="text" value={form.department} onChange={e=>set('department',e.target.value)} placeholder="Engineering, Finance…" style={inp}/></div>}
          <button type="submit" disabled={loading} style={{marginTop:4,width:'100%',padding:'10px 0',fontSize:13,fontWeight:500,cursor:loading?'not-allowed':'pointer',background:'var(--cs-primary)',color:'#fff',border:'none',borderRadius:'10px',opacity:loading?0.6:1,fontFamily:'var(--font-sans)'}}>
            {loading?'Please wait…':mode==='login'?'Sign in':'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── DashboardPage ─────────────────────────────────────────────────
export function DashboardPage({ onNavigate }: { onNavigate: (p:string)=>void }) {
  const { user } = useAuth();
  const { data, loading } = useDashboard();
  if (loading) return <div style={{padding:40,textAlign:'center',color:'var(--color-text-secondary)'}}>Loading…</div>;
  const d = data!;
  const card = {background:'var(--color-background-primary)',border:'0.5px solid var(--color-border-tertiary)',borderRadius:'var(--border-radius-lg)',padding:'14px 16px'};
  const mc = {background:'var(--color-background-secondary)',borderRadius:'var(--border-radius-md)',padding:'12px 14px'};
  return (
    <div style={{fontFamily:'var(--font-sans)'}}>
      <div style={{fontSize:17,fontWeight:500,marginBottom:2}}>Welcome back, {user?.username} 👋</div>
      <div style={{fontSize:12,color:'var(--color-text-secondary)',marginBottom:16}}>Your security awareness journey at a glance</div>
      <div className="cs-grid-4" style={{marginBottom:16}}>
        {[{label:'Total XP',value:d.xp,color:'var(--color-text-warning)'},{label:'Sims done',value:`${d.stats['totalSims']??0}/175`,color:'var(--color-text-info)'},{label:'Best quiz',value:`${d.stats['bestQuizPct']??0}%`,color:'var(--color-text-success)'},{label:'Modules',value:`${d.stats['modulesCompleted']??0}/7`,color:'var(--color-text-danger)'}].map(s=>(
          <div key={s.label} style={mc}><div style={{fontSize:11,color:'var(--color-text-secondary)'}}>{s.label}</div><div style={{fontSize:22,fontWeight:500,color:s.color,marginTop:3}}>{s.value}</div></div>
        ))}
      </div>
      <div className="cs-grid-2-lg" style={{marginBottom:14}}>
        <div style={card}>
          <div style={{fontSize:13,fontWeight:500,marginBottom:10}}>Vulnerability profile</div>
          {d.vulnProfile.length===0?<div style={{fontSize:12,color:'var(--color-text-secondary)'}}>Complete some simulations to see your profile.</div>:d.vulnProfile.map(v=>(
            <div key={v.category} style={{marginBottom:8}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:2}}><span style={{textTransform:'capitalize'}}>{v.category}</span><span style={{fontWeight:500}}>{v.vulnScore??0}% risk</span></div>
              <div style={{height:5,background:'var(--color-border-tertiary)',borderRadius:3,overflow:'hidden'}}><div style={{height:'100%',width:`${v.vulnScore??0}%`,background:'var(--color-text-danger)',opacity:.7,borderRadius:3}}/></div>
            </div>
          ))}
        </div>
        <div style={card}>
          <div style={{fontSize:13,fontWeight:500,marginBottom:10}}>Recent activity</div>
          {d.recentSims.length===0?<div style={{fontSize:12,color:'var(--color-text-secondary)'}}>No simulations yet. <button onClick={()=>onNavigate('simulations')} style={{background:'none',border:'none',cursor:'pointer',color:'var(--color-text-info)',fontSize:12,fontFamily:'var(--font-sans)'}}>Start now →</button></div>:d.recentSims.map((s,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'0.5px solid var(--color-border-tertiary)',fontSize:12}}>
              <span style={{background:s.passed?'var(--color-background-success)':'var(--color-background-danger)',color:s.passed?'var(--color-text-success)':'var(--color-text-danger)',fontSize:10,padding:'2px 7px',borderRadius:20,fontWeight:500,flexShrink:0}}>{s.passed?'Pass':'Fail'}</span>
              <span style={{flex:1,textTransform:'capitalize'}}>{s.category} #{s.scenario_id}</span>
              <span style={{color:'var(--color-text-info)',fontSize:11,fontWeight:500}}>+{s.xp_earned} XP</span>
            </div>
          ))}
        </div>
      </div>
      <div style={card}>
        <div style={{fontSize:13,fontWeight:500,marginBottom:10}}>Quick actions</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {[{label:'Practice a simulation',page:'simulations',icon:'ti-target'},{label:'Continue learning',page:'learn',icon:'ti-book-2'},{label:'Take knowledge quiz',page:'quiz',icon:'ti-brain'},{label:'Ask AI coach',page:'coach',icon:'ti-robot'}].map(a=>(
            <button key={a.label} onClick={()=>onNavigate(a.page)} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',fontSize:12,fontWeight:500,cursor:'pointer',border:'0.5px solid var(--color-border-secondary)',background:'var(--color-background-primary)',color:'var(--color-text-primary)',borderRadius:'var(--border-radius-md)',fontFamily:'var(--font-sans)'}}>
              <i className={`ti ${a.icon}`} style={{fontSize:15}} aria-hidden="true"/> {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── CoachPage ─────────────────────────────────────────────────────
export function CoachPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [coachMode, setCoachMode] = useState<'live'|'offline'|null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const STARTERS = ['What is social engineering?','How do I spot a phishing email?','What should I do if I clicked a phishing link?','Help me understand my weakest area'];
  useEffect(() => { coachApi.history().then(r=>setMessages(r.messages)).finally(()=>setLoading(false)); }, []);
  useEffect(() => { scrollRef.current?.scrollTo({top:scrollRef.current.scrollHeight,behavior:'smooth'}); }, [messages,sending]);
  const send = useCallback(async (text: string) => {
    if (!text.trim()||sending) return;
    setError(''); setSending(true); setFollowUps([]);
    setMessages(p=>[...p,{id:'u'+Date.now(),role:'user',content:text,created_at:new Date().toISOString()}]);
    setInput('');
    try { const r=await coachApi.send(text); setMessages(p=>[...p,{id:'a'+Date.now(),role:'assistant',content:r.reply,created_at:new Date().toISOString()}]); setFollowUps(r.suggestedFollowUps); if (r.mode) setCoachMode(r.mode); }
    catch(e){ setError((e as Error).message); } finally { setSending(false); }
  },[sending]);
  if (loading) return <div style={{padding:40,textAlign:'center',color:'var(--color-text-secondary)'}}>Loading…</div>;
  return (
    <div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 92px)',maxWidth:720,fontFamily:'var(--font-sans)'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:2,flexWrap:'wrap'}}>
        <div style={{fontSize:17,fontWeight:600}}>AI Security Coach</div>
        {coachMode&&(
          <span style={{fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:20,background:coachMode==='live'?'var(--cs-success-soft)':'var(--cs-primary-soft)',color:coachMode==='live'?'var(--cs-success)':'var(--cs-primary)'}}>
            {coachMode==='live'?'Live AI':'Offline coach'}
          </span>
        )}
      </div>
      <div style={{fontSize:12,color:'var(--color-text-secondary)',marginBottom:12}}>Ask about phishing, vishing, OTPs, deepfakes, or your weakest areas</div>
      <div ref={scrollRef} style={{flex:1,overflowY:'auto',background:'var(--color-background-primary)',border:'0.5px solid var(--color-border-tertiary)',borderRadius:'var(--border-radius-lg)',padding:16,display:'flex',flexDirection:'column',gap:12,marginBottom:10}}>
        {messages.length===0&&(
          <div style={{textAlign:'center',padding:'40px 20px',color:'var(--color-text-secondary)'}}>
            <i className="ti ti-robot" style={{fontSize:32,color:'var(--color-text-info)'}} aria-hidden="true"/>
            <div style={{fontSize:13,marginTop:8,marginBottom:14}}>Hi {user?.username}! I'm your AI security coach. Ask me anything:</div>
            <div style={{display:'flex',flexDirection:'column',gap:6,maxWidth:360,margin:'0 auto'}}>
              {STARTERS.map(p=><button key={p} onClick={()=>send(p)} style={{padding:'8px 12px',fontSize:12,textAlign:'left',cursor:'pointer',background:'var(--color-background-secondary)',border:'0.5px solid var(--color-border-tertiary)',borderRadius:'var(--border-radius-md)',color:'var(--color-text-primary)',fontFamily:'var(--font-sans)'}}>{p}</button>)}
            </div>
          </div>
        )}
        {messages.map(m=>(
          <div key={m.id} style={{display:'flex',justifyContent:m.role==='user'?'flex-end':'flex-start'}}>
            <div style={{maxWidth:'78%',padding:'9px 13px',borderRadius:'var(--border-radius-md)',fontSize:13,lineHeight:1.55,background:m.role==='user'?'var(--color-text-primary)':'var(--color-background-secondary)',color:m.role==='user'?'var(--color-background-primary)':'var(--color-text-primary)',whiteSpace:'pre-wrap'}}>{m.content}</div>
          </div>
        ))}
        {sending&&<div style={{display:'flex',justifyContent:'flex-start'}}><div style={{padding:'9px 13px',borderRadius:'var(--border-radius-md)',background:'var(--color-background-secondary)',fontSize:13,color:'var(--color-text-secondary)'}}>Thinking…</div></div>}
        {error&&<div style={{background:'var(--color-background-danger)',color:'var(--color-text-danger)',padding:'8px 12px',borderRadius:'var(--border-radius-md)',fontSize:12}}>{error}</div>}
      </div>
      {followUps.length>0&&<div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:8}}>{followUps.map(f=><button key={f} onClick={()=>send(f)} style={{padding:'5px 11px',fontSize:11,cursor:'pointer',background:'var(--color-background-info)',color:'var(--color-text-info)',border:'none',borderRadius:20,fontFamily:'var(--font-sans)'}}>{f}</button>)}</div>}
      <form onSubmit={e=>{e.preventDefault();send(input);}} style={{display:'flex',gap:8}}>
        <input value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask about phishing, vishing, deepfakes…" disabled={sending} style={{flex:1,padding:'10px 14px',fontSize:13,border:'0.5px solid var(--color-border-secondary)',borderRadius:'var(--border-radius-md)',background:'var(--color-background-primary)',color:'var(--color-text-primary)',fontFamily:'var(--font-sans)'}}/>
        <button type="submit" disabled={sending||!input.trim()} style={{padding:'10px 18px',fontSize:13,fontWeight:500,cursor:sending?'not-allowed':'pointer',background:'var(--cs-primary)',color:'#fff',border:'none',borderRadius:'10px',opacity:sending||!input.trim()?0.5:1,fontFamily:'var(--font-sans)'}}>Send</button>
      </form>
    </div>
  );
}

// ── LeaderboardPage ───────────────────────────────────────────────
export function LeaderboardPage() {
  const { user } = useAuth();
  const { data, loading } = useLeaderboard(20);
  if (loading) return <div style={{padding:40,textAlign:'center',color:'var(--color-text-secondary)'}}>Loading…</div>;
  return (
    <div style={{fontFamily:'var(--font-sans)'}}>
      <div style={{fontSize:17,fontWeight:500,marginBottom:2}}>Leaderboard</div>
      <div style={{fontSize:12,color:'var(--color-text-secondary)',marginBottom:16}}>Top performers ranked by XP</div>
      <div className="cs-table-wrap" style={{background:'var(--color-background-primary)',border:'0.5px solid var(--color-border-tertiary)',borderRadius:'var(--border-radius-lg)'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr>{['Rank','User','Department','XP','Streak','Sims passed','Badges'].map(h=><th key={h} style={{fontSize:11,fontWeight:500,color:'var(--color-text-secondary)',textAlign:'left',padding:'10px 14px',borderBottom:'0.5px solid var(--color-border-tertiary)'}}>{h}</th>)}</tr></thead>
          <tbody>
            {(data?.leaderboard??[]).map((u,i)=>(
              <tr key={u.id} style={{background:u.id===user?.id?'var(--color-background-info)':'transparent'}}>
                <td style={{padding:'10px 14px',fontSize:13}}>{i<3?['🥇','🥈','🥉'][i]:u.rank}</td>
                <td style={{padding:'10px 14px'}}><div style={{fontSize:13,fontWeight:500}}>{u.username}{u.id===user?.id&&<span style={{fontSize:10,background:'var(--color-background-info)',color:'var(--color-text-info)',padding:'1px 6px',borderRadius:20,marginLeft:4}}>you</span>}</div></td>
                <td style={{padding:'10px 14px',fontSize:12,color:'var(--color-text-secondary)'}}>{u.department??'—'}</td>
                <td style={{padding:'10px 14px',fontSize:13,fontWeight:500,color:'var(--color-text-warning)'}}>{u.xp}</td>
                <td style={{padding:'10px 14px',fontSize:12}}>{u.streak} 🔥</td>
                <td style={{padding:'10px 14px',fontSize:12}}>{u.sims_passed}</td>
                <td style={{padding:'10px 14px',fontSize:12}}>{u.badge_count} 🏅</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data?.leaderboard?.length&&<div style={{padding:32,textAlign:'center',color:'var(--color-text-secondary)',fontSize:12}}>No users yet — be the first!</div>}
      </div>
    </div>
  );
}
