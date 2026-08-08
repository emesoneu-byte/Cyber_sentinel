import React from 'react';

export default function AboutPage() {
  const s = (style: React.CSSProperties = {}) => ({ fontFamily: 'var(--font-sans)', ...style });
  const card: React.CSSProperties = { background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', padding: '16px 18px', marginBottom: 12 };

  return (
    <div style={s({ maxWidth: 640 })}>
      <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 2 }}>About CyberSentinel</div>
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 16 }}>Social Engineering Awareness & Simulation Platform</div>

      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Aim</div>
        <div style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--color-text-secondary)' }}>
          CyberSentinel trains users to recognise and resist social engineering attacks through interactive simulations, structured learning modules, knowledge quizzes, and simulated phishing campaigns — with progress tracking and an AI security coach. Scenarios include patterns commonly seen in Nigeria (bank OTP vishing, MD WhatsApp requests, FIRS smishing, Naira BEC, courier fee SMS).
        </div>
      </div>

      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Objectives</div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7, color: 'var(--color-text-secondary)' }}>
          <li>Provide realistic attack scenarios across phishing, vishing, smishing, pretexting, baiting, physical SE, and deepfake/AI fraud</li>
          <li>Organise practice into clear threat-type sections with progress tracking</li>
          <li>Assess conceptual knowledge via a separate theory quiz</li>
          <li>Enable administrators to run simulated phishing campaigns and view organisation risk metrics</li>
          <li>Reward correct behaviour with XP and badges (no XP for failed attempts)</li>
        </ul>
      </div>

      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>How the modules differ</div>
        <div style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--color-text-secondary)' }}>
          <strong style={{ color: 'var(--color-text-primary)' }}>Simulations</strong> place you inside a fake email, call, SMS, or chat and ask what you would do.<br /><br />
          <strong style={{ color: 'var(--color-text-primary)' }}>Knowledge Quiz</strong> is a written exam on concepts and red flags — not an interactive scene.<br /><br />
          <strong style={{ color: 'var(--color-text-primary)' }}>Learning Hub</strong> teaches the theory before you practice.<br /><br />
          <strong style={{ color: 'var(--color-text-primary)' }}>Campaigns (Admin)</strong> send simulated phishing emails to measure real click/report behaviour.
        </div>
      </div>

      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>XP rules</div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7, color: 'var(--color-text-secondary)' }}>
          <li>Simulations: XP only when you answer correctly the first time (or first time after a previous fail)</li>
          <li>Wrong answers award 0 XP</li>
          <li>Quiz: XP only on your first full attempt; retakes are practice only</li>
          <li>Reporting a simulated phishing email awards bonus XP</li>
        </ul>
      </div>

      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Tech stack</div>
        <div style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--color-text-secondary)' }}>
          Frontend: React + TypeScript + Vite<br />
          Backend: Node.js + Express + TypeScript<br />
          Database: SQLite (sql.js)<br />
          Auth: JWT access + refresh tokens<br />
          AI Coach: Anthropic API (optional key)
        </div>
      </div>

      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 8 }}>
        Final year project · CyberSentinel · Social Engineering Awareness Platform
      </div>
    </div>
  );
}
