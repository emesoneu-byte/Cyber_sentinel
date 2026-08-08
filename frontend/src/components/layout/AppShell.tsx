import React, { useState, useEffect, ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export type Page = 'dashboard'|'learn'|'simulations'|'quiz'|'coach'|'report'|'leaderboard'|'profile'|'about'|'admin';
interface Props { children: (page: Page, setPage: (p: Page)=>void)=>ReactNode; }
interface Toast { id: number; msg: string; xp?: number; type: 'success'|'badge'|'error'; }

let _tid = 0;
const listeners: Array<(t: Toast)=>void> = [];
export function showToast(msg: string, type: Toast['type']='success', xp?: number) {
  const t: Toast = { id: ++_tid, msg, xp, type };
  listeners.forEach(fn => fn(t));
}

const NAV: Array<{id:Page;label:string;icon:string;adminOnly?:boolean;section?:string}> = [
  { id: 'dashboard', label: 'Dashboard', icon: 'ti-layout-dashboard', section: 'main' },
  { id: 'learn', label: 'Learning Hub', icon: 'ti-book', section: 'train' },
  { id: 'simulations', label: 'Simulations', icon: 'ti-target', section: 'train' },
  { id: 'quiz', label: 'Knowledge Quiz', icon: 'ti-list-check', section: 'train' },
  { id: 'coach', label: 'AI Coach', icon: 'ti-message-chatbot', section: 'train' },
  { id: 'report', label: 'My Report', icon: 'ti-report-analytics', section: 'progress' },
  { id: 'leaderboard', label: 'Leaderboard', icon: 'ti-trophy', section: 'progress' },
  { id: 'profile', label: 'Profile', icon: 'ti-user-circle', section: 'account' },
  { id: 'about', label: 'About', icon: 'ti-info-circle', section: 'account' },
  { id: 'admin', label: 'Admin Panel', icon: 'ti-shield-cog', adminOnly: true, section: 'admin' },
];

export default function AppShell({ children }: Props) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [page, setPage] = useState<Page>('dashboard');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    const fn = (t: Toast) => {
      setToasts(p => [...p, t]);
      setTimeout(() => setToasts(p => p.filter(x => x.id !== t.id)), 3800);
    };
    listeners.push(fn);
    return () => { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); };
  }, []);

  const isAdmin = user?.role === 'admin';
  const visible = NAV.filter(n => !n.adminOnly || isAdmin);
  const go = (id: Page) => { setPage(id); setNavOpen(false); };

  const sections: { key: string; label: string }[] = [
    { key: 'main', label: '' },
    { key: 'train', label: 'Training' },
    { key: 'progress', label: 'Progress' },
    { key: 'account', label: 'Account' },
    ...(isAdmin ? [{ key: 'admin', label: 'Admin' }] : []),
  ];

  const sidebar = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#2563EB,#06B6D4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className="ti ti-shield-check" style={{ fontSize: 18, color: '#fff' }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#F8FAFC', letterSpacing: '-0.02em' }}>CyberSentinel</div>
            <div style={{ fontSize: 10, color: '#64748B', fontWeight: 500, letterSpacing: '0.04em', marginTop: 1 }}>LEARN · DETECT · DEFEND</div>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 10px' }}>
        {sections.map(sec => {
          const items = visible.filter(n => n.section === sec.key);
          if (!items.length) return null;
          return (
            <div key={sec.key} style={{ marginBottom: 14 }}>
              {sec.label && (
                <div style={{ fontSize: 10, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 10px 8px' }}>
                  {sec.label}
                </div>
              )}
              {items.map(n => {
                const active = page === n.id;
                return (
                  <button
                    key={n.id}
                    onClick={() => go(n.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                      padding: '9px 12px', marginBottom: 2, border: 'none', cursor: 'pointer',
                      borderRadius: 8, textAlign: 'left', fontFamily: 'var(--font-sans)', fontSize: 13,
                      fontWeight: active ? 600 : 450,
                      background: active ? 'rgba(37,99,235,.25)' : 'transparent',
                      color: active ? '#FFFFFF' : '#94A3B8',
                      boxShadow: active ? 'inset 3px 0 0 #2563EB' : 'none',
                    }}
                  >
                    <i className={`ti ${n.icon}`} style={{ fontSize: 17, flexShrink: 0, opacity: active ? 1 : 0.75 }} />
                    {n.label}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div style={{ padding: '12px 14px 16px', borderTop: '1px solid rgba(255,255,255,.08)' }}>
        <div style={{ fontSize: 12, color: '#E2E8F0', fontWeight: 600, marginBottom: 2 }}>{user?.username}</div>
        <div style={{ fontSize: 11, color: '#64748B', marginBottom: 10 }}>{user?.role === 'admin' ? 'Administrator' : 'Learner'} · {user?.xp ?? 0} XP</div>
        <button
          onClick={logout}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '8px 10px',
            background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)',
            borderRadius: 8, color: '#94A3B8', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-sans)',
          }}
        >
          <i className="ti ti-logout" /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--cs-bg)', fontFamily: 'var(--font-sans)', color: 'var(--cs-text)' }}>
      {/* Desktop sidebar */}
      <aside
        className="cs-sidebar-desktop"
        style={{
          width: 240, flexShrink: 0, background: 'var(--cs-sidebar)',
          position: 'sticky', top: 0, height: '100vh', overflow: 'hidden',
        }}
      >
        {sidebar}
      </aside>

      {/* Mobile overlay + drawer */}
      {navOpen && (
        <>
          <div onClick={() => setNavOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', zIndex: 40 }} />
          <aside style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: 260, background: 'var(--cs-sidebar)', zIndex: 50, boxShadow: 'var(--cs-shadow-md)' }}>
            {sidebar}
          </aside>
        </>
      )}

      {/* Main column */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header */}
        <header style={{
          height: 56, flexShrink: 0, background: 'var(--cs-card)', borderBottom: '1px solid var(--cs-border)',
          display: 'flex', alignItems: 'center', padding: '0 20px', gap: 8,
          position: 'sticky', top: 0, zIndex: 30, boxShadow: 'var(--cs-shadow)',
        }}>
          <button
            className="cs-menu-btn"
            onClick={() => setNavOpen(true)}
            aria-label="Open menu"
            style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cs-muted)', padding: 6, borderRadius: 8 }}
          >
            <i className="ti ti-menu-2" style={{ fontSize: 22 }} />
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--cs-text)' }}>
              {NAV.find(n => n.id === page)?.label ?? 'CyberSentinel'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--cs-muted)' }}>Learn. Detect. Defend.</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20,
              background: 'var(--cs-warning-soft)', color: 'var(--cs-warning)', fontSize: 12, fontWeight: 600,
            }}>
              <i className="ti ti-star-filled" style={{ fontSize: 13 }} /> {user?.xp ?? 0}
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20,
              background: 'var(--cs-danger-soft)', color: 'var(--cs-danger)', fontSize: 12, fontWeight: 600,
            }}>
              <i className="ti ti-flame" style={{ fontSize: 13 }} /> {user?.streak ?? 0}
            </div>
            {isAdmin && (
              <span style={{
                fontSize: 10, padding: '3px 8px', borderRadius: 20, fontWeight: 600,
                background: 'var(--cs-primary-soft)', color: 'var(--cs-primary)',
              }}>Admin</span>
            )}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              title={theme === 'light' ? 'Switch to dark' : 'Switch to light'}
              style={{
                width: 36, height: 36, borderRadius: 8, border: '1px solid var(--cs-border)',
                background: 'var(--cs-surface)', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: 'var(--cs-muted)',
              }}
            >
              <i className={`ti ${theme === 'light' ? 'ti-moon' : 'ti-sun'}`} style={{ fontSize: 16 }} />
            </button>
            <button
              onClick={() => go('profile')}
              style={{
                width: 36, height: 36, borderRadius: 8, border: '1px solid var(--cs-border)',
                background: 'var(--cs-primary-soft)', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: 'var(--cs-primary)', fontWeight: 700, fontSize: 13,
              }}
              title={user?.username}
            >
              {(user?.username ?? 'U').charAt(0).toUpperCase()}
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="cs-fade-in cs-main-pad" style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 40px' }}>
          {children(page, setPage)}
        </main>
      </div>

      {/* Toasts */}
      <div style={{ position: 'fixed', bottom: 16, right: 12, left: 12, display: 'flex', flexDirection: 'column', gap: 10, zIndex: 999, maxWidth: 420, marginLeft: 'auto' }}>
        {toasts.map(t => {
          const colors = t.type === 'error'
            ? { border: 'var(--cs-danger)', bg: 'var(--cs-danger-soft)', icon: 'ti-alert-triangle', ic: 'var(--cs-danger)' }
            : t.type === 'badge'
            ? { border: 'var(--cs-warning)', bg: 'var(--cs-warning-soft)', icon: 'ti-award', ic: 'var(--cs-warning)' }
            : { border: 'var(--cs-success)', bg: 'var(--cs-success-soft)', icon: 'ti-circle-check', ic: 'var(--cs-success)' };
          return (
            <div
              key={t.id}
              className="cs-slide-up"
              style={{
                background: 'var(--cs-card)', border: `1px solid ${colors.border}`,
                borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
                boxShadow: 'var(--cs-shadow-md)', fontSize: 13,
              }}
            >
              <div style={{ width: 32, height: 32, borderRadius: 8, background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={`ti ${colors.icon}`} style={{ color: colors.ic, fontSize: 16 }} />
              </div>
              <span style={{ flex: 1, color: 'var(--cs-text)', fontWeight: 500 }}>{t.msg}</span>
              {t.xp != null && t.xp > 0 && (
                <span style={{ background: 'var(--cs-success-soft)', color: 'var(--cs-success)', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                  +{t.xp} XP
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
