import React, { useState, useEffect, useCallback } from 'react';
import { adminApi, type User, type Campaign, type EmailTemplate } from '../api/client';
import { showToast } from '../components/layout/AppShell';

type Tab = 'overview' | 'users' | 'campaigns' | 'templates' | 'audit';

const s = (style: React.CSSProperties = {}) => ({ fontFamily: 'var(--font-sans)', ...style });
const card: React.CSSProperties = { background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', padding: '14px 16px' };
const btn = (primary = false): React.CSSProperties => ({
  padding: '7px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer', borderRadius: 'var(--border-radius-md)',
  border: primary ? 'none' : '0.5px solid var(--color-border-secondary)',
  background: primary ? 'var(--color-brand)' : 'var(--color-background-primary)',
  color: primary ? '#fff' : 'var(--color-text-primary)', fontFamily: 'var(--font-sans)',
});
const inp: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 12, border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)', background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)' };

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: 'ti-chart-bar' },
    { id: 'users', label: 'Users', icon: 'ti-users' },
    { id: 'campaigns', label: 'Campaigns', icon: 'ti-mail-forward' },
    { id: 'templates', label: 'Templates', icon: 'ti-template' },
    { id: 'audit', label: 'Audit log', icon: 'ti-list-details' },
  ];

  return (
    <div style={s()}>
      <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 2 }}>Admin Panel</div>
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 14 }}>Manage users, phishing campaigns, and organisation statistics</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={s({
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', fontSize: 12, cursor: 'pointer',
            borderRadius: 20, border: '0.5px solid var(--color-border-secondary)',
            background: tab === t.id ? 'var(--color-brand)' : 'var(--color-background-primary)',
            color: tab === t.id ? '#fff' : 'var(--color-text-secondary)', fontWeight: tab === t.id ? 500 : 400,
          })}>
            <i className={`ti ${t.icon}`} /> {t.label}
          </button>
        ))}
      </div>
      {tab === 'overview' && <OverviewTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'campaigns' && <CampaignsTab />}
      {tab === 'templates' && <TemplatesTab />}
      {tab === 'audit' && <AuditTab />}
    </div>
  );
}

function OverviewTab() {
  const [data, setData] = useState<Awaited<ReturnType<typeof adminApi.stats>> | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { adminApi.stats().then(setData).catch(e => showToast(e.message, 'error')).finally(() => setLoading(false)); }, []);
  if (loading) return <div style={{ padding: 30, textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 13 }}>Loading…</div>;
  if (!data) return null;
  const o = data.overview;
  return (
    <div>
      <div className="cs-grid-4" style={{ gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Active users', value: o.totalUsers, color: 'var(--color-text-info)' },
          { label: 'Sim attempts', value: o.totalSims, color: 'var(--color-text-brand)' },
          { label: 'Quiz attempts', value: o.totalQuizzes, color: 'var(--color-text-warning)' },
          { label: 'Avg quiz %', value: `${o.avgQuizPct ?? 0}%`, color: 'var(--color-text-success)' },
        ].map(x => (
          <div key={x.label} style={{ background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)', padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{x.label}</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: x.color, marginTop: 4 }}>{x.value}</div>
          </div>
        ))}
      </div>
      <div className="cs-grid-2-lg" style={{ gap: 12 }}>
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Pass rate by category</div>
          {data.simsByCategory.length === 0 && <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>No simulation data yet.</div>}
          {data.simsByCategory.map(c => (
            <div key={c.category} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                <span style={{ textTransform: 'capitalize' }}>{c.category}</span>
                <span style={{ fontWeight: 500 }}>{c.pass_rate ?? 0}% ({c.passes}/{c.attempts})</span>
              </div>
              <div style={{ height: 5, background: 'var(--color-border-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${c.pass_rate ?? 0}%`, background: 'var(--color-brand)', borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Top performers</div>
          {data.topUsers.length === 0 && <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>No users yet.</div>}
          {data.topUsers.map((u, i) => (
            <div key={u.username} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '0.5px solid var(--color-border-tertiary)', fontSize: 12 }}>
              <span style={{ width: 18, fontWeight: 600, color: 'var(--color-text-tertiary)' }}>{i + 1}</span>
              <span style={{ flex: 1, fontWeight: 500 }}>{u.username}</span>
              <span style={{ color: 'var(--color-text-secondary)' }}>{u.department ?? '—'}</span>
              <span style={{ color: 'var(--color-text-warning)', fontWeight: 500 }}>{u.xp} XP</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    setLoading(true);
    adminApi.users({ search: search || undefined, limit: 100 })
      .then(r => setUsers(r.users))
      .catch(e => showToast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, [search]);
  useEffect(() => { load(); }, [load]);

  const toggleActive = async (u: User) => {
    try {
      await adminApi.updateUser(u.id, { is_active: !(u.is_active === 1) });
      showToast(u.is_active === 1 ? 'User deactivated' : 'User activated', 'success');
      load();
    } catch (e) { showToast((e as Error).message, 'error'); }
  };
  const setRole = async (u: User, role: string) => {
    try {
      await adminApi.updateUser(u.id, { role });
      showToast(`Role set to ${role}`, 'success');
      load();
    } catch (e) { showToast((e as Error).message, 'error'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search username or email…" style={{ ...inp, maxWidth: 280 }} />
        <button onClick={load} style={btn(true)}>Search</button>
      </div>
      {loading ? <div style={{ padding: 20, color: 'var(--color-text-secondary)', fontSize: 13 }}>Loading…</div> : (
        <div className="cs-table-wrap" style={{ ...card, padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['User', 'Department', 'Role', 'XP', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', textAlign: 'left', padding: '10px 12px', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{ padding: '10px 12px', fontSize: 12 }}>
                    <div style={{ fontWeight: 500 }}>{u.username}</div>
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: 11 }}>{u.email}</div>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--color-text-secondary)' }}>{u.department ?? '—'}</td>
                  <td style={{ padding: '10px 12px', fontSize: 12 }}>
                    <select value={u.role} onChange={e => setRole(u, e.target.value)} style={{ ...inp, width: 'auto', padding: '4px 8px' }}>
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 500, color: 'var(--color-text-warning)' }}>{u.xp}</td>
                  <td style={{ padding: '10px 12px', fontSize: 12 }}>
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 500, background: u.is_active === 0 ? 'var(--color-background-danger)' : 'var(--color-background-success)', color: u.is_active === 0 ? 'var(--color-text-danger)' : 'var(--color-text-success)' }}>
                      {u.is_active === 0 ? 'Inactive' : 'Active'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <button onClick={() => toggleActive(u)} style={btn(false)}>{u.is_active === 0 ? 'Activate' : 'Deactivate'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 12 }}>No users found.</div>}
        </div>
      )}
    </div>
  );
}

function CampaignsTab() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', templateId: '', targetDepartment: '' });
  const [launching, setLaunching] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([adminApi.campaigns(), adminApi.templates()])
      .then(([c, t]) => { setCampaigns(c.campaigns); setTemplates(t.templates); })
      .catch(e => showToast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.name.trim() || !form.templateId) { showToast('Name and template required', 'error'); return; }
    try {
      const r = await adminApi.createCampaign({ name: form.name, templateId: form.templateId, targetDepartment: form.targetDepartment || undefined });
      showToast(`Campaign created · ${r.recipientCount} recipients`, 'success');
      setShowCreate(false); setForm({ name: '', templateId: '', targetDepartment: '' }); load();
    } catch (e) { showToast((e as Error).message, 'error'); }
  };

  const launch = async (id: string) => {
    setLaunching(id);
    try {
      const r = await adminApi.launchCampaign(id);
      showToast(`Launched: ${r.sentCount} sent, ${r.failedCount} failed`, r.failedCount ? 'error' : 'success');
      load();
    } catch (e) { showToast((e as Error).message, 'error'); }
    finally { setLaunching(null); }
  };

  const cancel = async (id: string) => {
    try { await adminApi.cancelCampaign(id); showToast('Campaign cancelled', 'success'); load(); }
    catch (e) { showToast((e as Error).message, 'error'); }
  };

  if (loading) return <div style={{ padding: 20, color: 'var(--color-text-secondary)', fontSize: 13 }}>Loading…</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{campaigns.length} campaign(s)</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={async () => { try { const r = await adminApi.testEmail(); showToast(r.message, 'success'); } catch (e) { showToast((e as Error).message, 'error'); } }} style={btn(false)}>Test SMTP</button>
          <button onClick={() => setShowCreate(!showCreate)} style={btn(true)}>{showCreate ? 'Close' : '+ New campaign'}</button>
        </div>
      </div>
      {showCreate && (
        <div style={{ ...card, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Create phishing campaign</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 420 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Campaign name</label>
              <input style={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Q1 awareness test" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Template</label>
              <select style={inp} value={form.templateId} onChange={e => setForm(f => ({ ...f, templateId: e.target.value }))}>
                <option value="">Select template…</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.category} / {t.difficulty})</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Target department (optional — leave blank for all users)</label>
              <input style={inp} value={form.targetDepartment} onChange={e => setForm(f => ({ ...f, targetDepartment: e.target.value }))} placeholder="e.g. Finance" />
            </div>
            <button onClick={create} style={btn(true)}>Create campaign</button>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {campaigns.map(c => (
          <div key={c.id} style={card}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                  {c.template_name ?? 'Template'} · {c.category ?? '—'} · {c.recipient_count ?? 0} recipients · by {c.creator_name ?? '—'}
                </div>
                <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 11 }}>
                  <span style={{ padding: '2px 8px', borderRadius: 20, background: 'var(--color-background-secondary)', fontWeight: 500 }}>{c.status}</span>
                  {c.clicked_count != null && <span style={{ color: 'var(--color-text-danger)' }}>{c.clicked_count} clicked</span>}
                  {c.reported_count != null && <span style={{ color: 'var(--color-text-success)' }}>{c.reported_count} reported</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {(c.status === 'draft' || c.status === 'scheduled') && (
                  <button onClick={() => launch(c.id)} disabled={launching === c.id} style={btn(true)}>
                    {launching === c.id ? 'Sending…' : 'Launch'}
                  </button>
                )}
                {c.status !== 'completed' && c.status !== 'cancelled' && (
                  <button onClick={() => cancel(c.id)} style={btn(false)}>Cancel</button>
                )}
              </div>
            </div>
          </div>
        ))}
        {campaigns.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 12 }}>No campaigns yet. Create one to run a simulated phishing test.</div>}
      </div>
    </div>
  );
}

function TemplatesTab() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', category: 'phishing', difficulty: 'easy', subject: '',
    senderName: '', senderEmail: '', htmlBody: '<p>Hello,</p><p>Please click the button below.</p><p><a href="{{TRACKING_LINK}}">Click here</a></p><p>Regards</p>',
    redFlags: 'Urgency, Suspicious link, Spoofed sender',
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const load = useCallback(() => {
    setLoading(true);
    adminApi.templates().then(r => setTemplates(r.templates)).catch(e => showToast(e.message, 'error')).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.name.trim() || !form.subject.trim() || !form.senderName.trim() || !form.senderEmail.trim() || !form.htmlBody.trim()) {
      showToast('Fill in all required fields', 'error'); return;
    }
    if (!form.htmlBody.includes('{{TRACKING_LINK}}')) {
      showToast('HTML body must include {{TRACKING_LINK}} so clicks can be tracked', 'error'); return;
    }
    const redFlags = form.redFlags.split(',').map(s => s.trim()).filter(Boolean);
    if (redFlags.length < 1) { showToast('Add at least one red flag', 'error'); return; }
    setSaving(true);
    try {
      await adminApi.createTemplate({
        name: form.name, category: form.category, difficulty: form.difficulty,
        subject: form.subject, senderName: form.senderName, senderEmail: form.senderEmail,
        htmlBody: form.htmlBody, redFlags,
      });
      showToast('Template created', 'success');
      setShowCreate(false);
      setForm({ name: '', category: 'phishing', difficulty: 'easy', subject: '', senderName: '', senderEmail: '', htmlBody: '<p>Hello,</p><p>Please click the button below.</p><p><a href="{{TRACKING_LINK}}">Click here</a></p><p>Regards</p>', redFlags: 'Urgency, Suspicious link, Spoofed sender' });
      load();
    } catch (e) { showToast((e as Error).message, 'error'); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    try { await adminApi.deleteTemplate(id); showToast('Template deleted', 'success'); load(); }
    catch (e) { showToast((e as Error).message, 'error'); }
  };

  if (loading) return <div style={{ padding: 20, color: 'var(--color-text-secondary)', fontSize: 13 }}>Loading…</div>;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{templates.length} template(s) · use {'{{TRACKING_LINK}}'} in HTML for click tracking</div>
        <button onClick={() => setShowCreate(!showCreate)} style={btn(true)}>{showCreate ? 'Close' : '+ Design template'}</button>
      </div>
      {showCreate && (
        <div style={{ ...card, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Design phishing email template</div>
          <div className="cs-grid-2" style={{ gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Template name *</label>
              <input style={inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Fake payroll alert" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Subject *</label>
              <input style={inp} value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="URGENT: Action required" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Category</label>
              <select style={inp} value={form.category} onChange={e => set('category', e.target.value)}>
                {['phishing','vishing','smishing','pretexting','baiting','physical','deepfake'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Difficulty</label>
              <select style={inp} value={form.difficulty} onChange={e => set('difficulty', e.target.value)}>
                <option value="easy">easy</option>
                <option value="medium">medium</option>
                <option value="hard">hard</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Sender display name *</label>
              <input style={inp} value={form.senderName} onChange={e => set('senderName', e.target.value)} placeholder="IT Helpdesk" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Sender email * (can be spoofed-looking)</label>
              <input style={inp} value={form.senderEmail} onChange={e => set('senderEmail', e.target.value)} placeholder="it-helpdesk@corp0rate-support.net" />
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <label style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>HTML body * (must include {'{{TRACKING_LINK}}'})</label>
            <textarea style={{ ...inp, minHeight: 120, fontFamily: 'var(--font-mono)', fontSize: 11 }} value={form.htmlBody} onChange={e => set('htmlBody', e.target.value)} />
          </div>
          <div style={{ marginTop: 10 }}>
            <label style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Red flags (comma-separated) *</label>
            <input style={inp} value={form.redFlags} onChange={e => set('redFlags', e.target.value)} placeholder="Urgency, Lookalike domain, Threat of lockout" />
          </div>
          <button onClick={create} disabled={saving} style={{ ...btn(true), marginTop: 12, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Save template'}</button>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {templates.map(t => {
          const flags = Array.isArray(t.red_flags) ? t.red_flags : (typeof t.red_flags === 'string' ? JSON.parse(t.red_flags as string) : []);
          return (
            <div key={t.id} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                    {t.category} · {t.difficulty} · From: {t.sender_name} &lt;{t.sender_email}&gt;
                  </div>
                  <div style={{ fontSize: 12, marginTop: 6, fontWeight: 500 }}>{t.subject}</div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                    {flags.map((f: string) => <span key={f} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'var(--color-background-danger)', color: 'var(--color-text-danger)' }}>{f}</span>)}
                  </div>
                </div>
                <button onClick={() => remove(t.id)} style={{ ...btn(false), color: 'var(--color-text-danger)', alignSelf: 'flex-start' }}>Delete</button>
              </div>
            </div>
          );
        })}
        {templates.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 12 }}>No templates yet. Design one above or restart the server to seed defaults.</div>}
      </div>
    </div>
  );
}

function AuditTab() {
  const [logs, setLogs] = useState<Array<{ id: string; username?: string; action: string; detail: unknown; ip: string|null; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    adminApi.audit(80).then(r => setLogs(r.logs)).catch(e => showToast(e.message, 'error')).finally(() => setLoading(false));
  }, []);
  if (loading) return <div style={{ padding: 20, color: 'var(--color-text-secondary)', fontSize: 13 }}>Loading…</div>;
  return (
    <div className="cs-table-wrap" style={{ ...card, padding: 0 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>{['Time', 'User', 'Action', 'IP'].map(h => (
            <th key={h} style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', textAlign: 'left', padding: '10px 12px', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>{h}</th>
          ))}</tr>
        </thead>
        <tbody>
          {logs.map(l => (
            <tr key={l.id}>
              <td style={{ padding: '8px 12px', fontSize: 11, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{l.created_at?.replace('T', ' ').slice(0, 19)}</td>
              <td style={{ padding: '8px 12px', fontSize: 12 }}>{l.username ?? '—'}</td>
              <td style={{ padding: '8px 12px', fontSize: 12, fontWeight: 500 }}>{l.action}</td>
              <td style={{ padding: '8px 12px', fontSize: 11, color: 'var(--color-text-tertiary)' }}>{l.ip ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {logs.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 12 }}>No audit entries yet.</div>}
    </div>
  );
}
