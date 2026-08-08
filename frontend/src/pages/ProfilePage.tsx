import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { userApi } from '../api/client';
import { showToast } from '../components/layout/AppShell';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [department, setDepartment] = useState(user?.department ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);

  const s = (style: React.CSSProperties = {}) => ({ fontFamily: 'var(--font-sans)', ...style });
  const card: React.CSSProperties = { background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', padding: '16px 18px', marginBottom: 14, maxWidth: 480 };
  const inp: React.CSSProperties = { width: '100%', padding: '8px 12px', fontSize: 13, border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)', background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)' };
  const label: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 4 };

  const saveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await userApi.updateProfile({ department });
      await refreshUser();
      showToast('Profile updated', 'success');
    } catch (err) { showToast((err as Error).message, 'error'); }
    finally { setSaving(false); }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      showToast('Password must be 8+ chars with 1 uppercase and 1 number', 'error');
      return;
    }
    setPwdSaving(true);
    try {
      await userApi.updateProfile({ currentPassword, newPassword });
      setCurrentPassword(''); setNewPassword('');
      showToast('Password changed', 'success');
    } catch (err) { showToast((err as Error).message, 'error'); }
    finally { setPwdSaving(false); }
  };

  return (
    <div style={s()}>
      <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 2 }}>My Profile</div>
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 16 }}>Account details and security settings</div>

      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Account</div>
        <div className="cs-grid-2" style={{ gap: 12, fontSize: 13 }}>
          <div><div style={label}>Username</div><div style={{ fontWeight: 500 }}>{user?.username}</div></div>
          <div><div style={label}>Email</div><div>{user?.email}</div></div>
          <div><div style={label}>Role</div><div style={{ textTransform: 'capitalize' }}>{user?.role}</div></div>
          <div><div style={label}>XP / Streak</div><div><span style={{ color: 'var(--color-text-warning)', fontWeight: 500 }}>{user?.xp ?? 0} XP</span> · {user?.streak ?? 0} 🔥</div></div>
        </div>
      </div>

      <form onSubmit={saveDept} style={card}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Department</div>
        <label style={label}>Department</label>
        <input style={inp} value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. Computer Science, Finance" />
        <button type="submit" disabled={saving} style={{ marginTop: 12, padding: '8px 16px', fontSize: 12, fontWeight: 500, cursor: 'pointer', background: 'var(--color-brand)', color: '#fff', border: 'none', borderRadius: 'var(--border-radius-md)', opacity: saving ? 0.6 : 1, fontFamily: 'var(--font-sans)' }}>
          {saving ? 'Saving…' : 'Save department'}
        </button>
      </form>

      <form onSubmit={changePassword} style={card}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Change password</div>
        <div style={{ marginBottom: 10 }}>
          <label style={label}>Current password</label>
          <input type="password" style={inp} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={label}>New password (min 8 chars, 1 uppercase, 1 number)</label>
          <input type="password" style={inp} value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
        </div>
        <button type="submit" disabled={pwdSaving} style={{ padding: '8px 16px', fontSize: 12, fontWeight: 500, cursor: 'pointer', background: 'var(--color-text-primary)', color: 'var(--color-background-primary)', border: 'none', borderRadius: 'var(--border-radius-md)', opacity: pwdSaving ? 0.6 : 1, fontFamily: 'var(--font-sans)' }}>
          {pwdSaving ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  );
}
