import React, { useState } from 'react';
import { moduleApi } from '../api/client';
import { showToast } from '../components/layout/AppShell';

interface Module {
  id: string;
  title: string;
  icon: string;
  accent: string;
  time: string;
  level: string;
  summary: string;
  content: { body: string };
}

const MODULES: Module[] = [
  {
    id: 'phishing', title: 'Phishing Attacks', icon: 'ti-mail', accent: '#2563EB', time: '10 min', level: 'Foundation',
    summary: 'How attackers use fake emails and websites to steal credentials and money.',
    content: { body: `
<h3>What is phishing?</h3>
<p>Phishing is a social engineering attack where criminals impersonate trusted entities — banks, employers, government agencies, or software vendors — through email or fake websites. The goal is usually to steal login credentials, financial details, or to install malware.</p>
<h3>Common types</h3>
<ul>
<li><strong>Spear phishing</strong> — targeted messages that use personal or company details about you</li>
<li><strong>Whaling</strong> — spear phishing aimed at executives and high-value accounts</li>
<li><strong>Clone phishing</strong> — a legitimate email is copied and resent with a malicious link or attachment</li>
<li><strong>Business Email Compromise (BEC)</strong> — attackers pose as a CEO/MD and request urgent payments</li>
</ul>
<h3>How to spot a phishing email</h3>
<ul>
<li>Sender domain does not match the real organisation (e.g. gtbank-verify-ng.com vs official GTBank)</li>
<li>Urgency or threats: “Account suspended in 2 hours”</li>
<li>Unexpected attachments or “Click here to verify”</li>
<li>Generic greeting (“Dear Customer”) when the real service normally uses your name</li>
<li>Hovering a link shows a different destination than the visible text</li>
</ul>
<div class="ng-box"><strong>Nigeria context:</strong> Bank impersonation emails, “MD needs urgent Naira transfer”, and fake courier fee messages are among the most common local phishing patterns.</div>
<div class="tip-box"><strong>Defend:</strong> Never enter passwords from an email link. Open the official app or type the known URL yourself. Report suspicious mail to IT/security.</div>
` }
  },
  {
    id: 'vishing', title: 'Vishing & Phone Scams', icon: 'ti-phone', accent: '#06B6D4', time: '8 min', level: 'Foundation',
    summary: 'Voice calls that pressure you into sharing OTPs, PINs, or remote access.',
    content: { body: `
<h3>What is vishing?</h3>
<p>Vishing (voice phishing) uses phone calls to manipulate people into revealing secrets or approving fraudulent actions. Attackers often claim to be from IT support, a bank fraud desk, tax authorities, or the police.</p>
<h3>Typical scripts</h3>
<ul>
<li>“This is the bank fraud unit — share the OTP we just sent so we can cancel a transfer.”</li>
<li>“IT helpdesk: your PC is infected. Install this remote tool now.”</li>
<li>“You owe back taxes / a fine. Pay immediately or face arrest.”</li>
</ul>
<h3>Red flags</h3>
<ul>
<li>Unexpected call that creates fear or extreme urgency</li>
<li>Request for OTP, PIN, password, or remote desktop access</li>
<li>Caller refuses to let you hang up and call the official number</li>
<li>Pressure to keep the conversation secret from colleagues</li>
</ul>
<div class="ng-box"><strong>Nigeria context:</strong> “UBA/GTBank fraud desk” OTP calls and fake EFCC-style threats are widespread. No legitimate bank will ask you for an OTP on an inbound call.</div>
<div class="tip-box"><strong>Defend:</strong> Hang up. Call back only using the number on your ATM card, bank app, or official website — never a number the caller gives you.</div>
` }
  },
  {
    id: 'smishing', title: 'Smishing (SMS & Chat)', icon: 'ti-message', accent: '#8B5CF6', time: '8 min', level: 'Foundation',
    summary: 'Fraudulent SMS, WhatsApp, and chat messages with malicious links or payment requests.',
    content: { body: `
<h3>What is smishing?</h3>
<p>Smishing is phishing delivered by SMS or messaging apps. Messages often claim a parcel is waiting, a tax ID is suspended, or a manager needs urgent airtime — then push a link or payment request.</p>
<h3>Common patterns</h3>
<ul>
<li>Courier fee SMS (small Naira amount to “release” a package)</li>
<li>Bank transfer OTP messages timed with a simultaneous phone call</li>
<li>WhatsApp from a “MD/CEO” asking for airtime or emergency funds on a new number</li>
<li>Fake government alerts (FIRS, NIMC) demanding you open a link</li>
</ul>
<h3>How to respond</h3>
<ul>
<li>Do not tap links in unexpected texts</li>
<li>Verify delivery status only inside the official courier app or website</li>
<li>Confirm money requests through a second channel you already trust</li>
<li>Never share OTPs with anyone, including people who claim to be bank staff</li>
</ul>
<div class="warn-box"><strong>Remember:</strong> Legitimate services do not need you to pay random “clearance fees” via SMS links or to send OTPs to a stranger on the phone.</div>
` }
  },
  {
    id: 'pretexting', title: 'Pretexting & Impersonation', icon: 'ti-user-exclamation', accent: '#F59E0B', time: '9 min', level: 'Intermediate',
    summary: 'Fabricated stories used to extract data, access, or payment approvals.',
    content: { body: `
<h3>What is pretexting?</h3>
<p>Pretexting means inventing a believable story (the “pretext”) to gain trust and extract information or action. The attacker may pose as a new contractor, HR, a supplier, or a colleague in a rush.</p>
<h3>Examples</h3>
<ul>
<li>Fake IT contractor asking for VPN credentials “to finish setup today”</li>
<li>Payroll email changing a staff bank account mid-cycle</li>
<li>Supplier claiming a new account number for an outstanding invoice</li>
<li>Request for a full employee directory “for onboarding partners”</li>
</ul>
<h3>Defence checklist</h3>
<ul>
<li>Verify identity through known official channels before sharing data</li>
<li>Follow change-control procedures for bank details and access rights</li>
<li>Be wary of urgency + secrecy combinations</li>
<li>When in doubt, escalate to your manager or security team</li>
</ul>
<div class="tip-box"><strong>Defend:</strong> Procedures exist to slow attackers down. Using them is not being difficult — it is being professional.</div>
` }
  },
  {
    id: 'baiting', title: 'Baiting & Physical Lures', icon: 'ti-fish-hook', accent: '#10B981', time: '7 min', level: 'Intermediate',
    summary: 'USB drops, free downloads, and QR codes designed to make you act first and think later.',
    content: { body: `
<h3>What is baiting?</h3>
<p>Baiting tempts the victim with something desirable — a free USB stick, a “salary review” spreadsheet, a QR code for a prize — that delivers malware or steals data when used.</p>
<h3>Common baits</h3>
<ul>
<li>USB drives left in parking lots or reception labelled “Confidential” or “Payroll”</li>
<li>Free cracked software or “mandatory” browser extensions</li>
<li>QR codes on posters that open phishing pages</li>
<li>Too-good-to-be-true job surveys harvesting personal data</li>
</ul>
<div class="warn-box"><strong>Never</strong> plug in an unknown USB device into a work computer. Hand it to IT/security if found on site.</div>
<div class="tip-box"><strong>Defend:</strong> Only install software from approved sources. Scan QR destinations carefully before entering credentials.</div>
` }
  },
  {
    id: 'physical', title: 'Physical Social Engineering', icon: 'ti-door-enter', accent: '#EF4444', time: '8 min', level: 'Intermediate',
    summary: 'Tailgating, shoulder surfing, dumpster diving, and unsupervised visitors.',
    content: { body: `
<h3>Why physical security matters</h3>
<p>Digital defences fail if someone can walk into the office, read screens, or take documents. Physical social engineering exploits politeness and routine.</p>
<h3>Key risks</h3>
<ul>
<li><strong>Tailgating</strong> — following an authorised person through a secure door without badging</li>
<li><strong>Shoulder surfing</strong> — watching passwords or sensitive data on screens in public</li>
<li><strong>Dumpster diving</strong> — recovering confidential printouts from bins</li>
<li><strong>Unsupervised visitors</strong> — guests left alone in open-plan areas</li>
</ul>
<h3>Good habits</h3>
<ul>
<li>Everyone badges individually — no exceptions for “my card is broken”</li>
<li>Use privacy screens for sensitive work in public spaces</li>
<li>Shred confidential documents; do not rely on regular recycling</li>
<li>Escort visitors; use designated waiting areas</li>
</ul>
<div class="tip-box"><strong>Defend:</strong> Be polite but firm. Direct unknown people to reception rather than holding doors open.</div>
` }
  },
  {
    id: 'deepfake', title: 'AI, Deepfakes & Voice Clones', icon: 'ti-robot', accent: '#EC4899', time: '10 min', level: 'Advanced',
    summary: 'Synthetic video and voice used for fraud and high-pressure approval requests.',
    content: { body: `
<h3>What changed with AI?</h3>
<p>Attackers can now clone a voice from a short audio sample and generate convincing video of executives. A real case involved a deepfake CFO video call used to authorise a multi-million dollar transfer.</p>
<h3>Attack patterns</h3>
<ul>
<li>Deepfake video call from “CFO/MD” requesting an urgent confidential payment</li>
<li>AI-cloned voice of a manager asking for files to a personal email</li>
<li>Fake recruiter profiles built with AI images requesting ID documents</li>
</ul>
<h3>How to stay safe</h3>
<ul>
<li>High-risk requests must follow policy — video presence is not enough proof</li>
<li>Verify via a second known channel (callback on a stored number, in-person, dual approval)</li>
<li>Never send client databases or credentials to personal email addresses</li>
<li>Be sceptical of “do not tell anyone / skip the normal process” instructions</li>
</ul>
<div class="warn-box"><strong>Key idea:</strong> Trust the process, not the face or voice on the call. Deepfakes are designed to bypass human instinct.</div>
` }
  },
];

interface Props { completedModules: string[]; onComplete: (moduleId: string) => void; }

export default function LearnPage({ completedModules, onComplete }: Props) {
  const [selected, setSelected] = useState<Module | null>(null);
  const [completing, setCompleting] = useState(false);

  const handleComplete = async (mod: Module) => {
    if (completedModules.includes(mod.id)) { setSelected(null); return; }
    setCompleting(true);
    try {
      const res = await moduleApi.complete(mod.id);
      showToast(`${mod.title} completed!`, 'success', res.xpEarned);
      if (res.newBadges.length > 0) res.newBadges.forEach(b => showToast(`Badge unlocked: ${b.label}`, 'badge'));
      onComplete(mod.id);
    } catch (e) {
      showToast((e as Error).message, 'error');
    } finally {
      setCompleting(false);
      setSelected(null);
    }
  };

  const doneCount = completedModules.length;
  const progress = Math.round((doneCount / MODULES.length) * 100);

  if (selected) {
    const done = completedModules.includes(selected.id);
    return (
      <div className="cs-slide-up" style={{ maxWidth: 720 }}>
        <button
          onClick={() => setSelected(null)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cs-muted)',
            fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-sans)',
          }}
        >
          <i className="ti ti-arrow-left" /> Back to Learning Hub
        </button>

        <div style={{
          background: 'var(--cs-card)', border: '1px solid var(--cs-border)', borderRadius: 'var(--cs-radius-lg)',
          padding: '24px 28px', boxShadow: 'var(--cs-shadow)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12, background: `${selected.accent}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className={`ti ${selected.icon}`} style={{ fontSize: 22, color: selected.accent }} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--cs-text)' }}>{selected.title}</div>
              <div style={{ fontSize: 12, color: 'var(--cs-muted)', marginTop: 2 }}>
                {selected.level} · {selected.time} read · {done ? 'Completed' : 'Not completed'}
              </div>
            </div>
          </div>

          <div className="cs-learn-body" style={{ marginTop: 20 }} dangerouslySetInnerHTML={{ __html: selected.content.body }} />

          <div style={{ marginTop: 24, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => handleComplete(selected)}
              disabled={completing}
              style={{
                padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: completing ? 'not-allowed' : 'pointer',
                background: done ? 'var(--cs-success)' : 'var(--cs-primary)', color: '#fff', border: 'none',
                borderRadius: 10, opacity: completing ? 0.7 : 1, fontFamily: 'var(--font-sans)',
              }}
            >
              {done ? '✓ Completed — back to list' : completing ? 'Saving…' : 'Mark as complete (+XP)'}
            </button>
            <button
              onClick={() => setSelected(null)}
              style={{
                padding: '10px 18px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                background: 'var(--cs-surface)', color: 'var(--cs-text)', border: '1px solid var(--cs-border)',
                borderRadius: 10, fontFamily: 'var(--font-sans)',
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cs-fade-in">
      <div style={{ marginBottom: 6, fontSize: 13, color: 'var(--cs-muted)' }}>
        Structured lessons before you practise in Simulations. Complete modules to earn XP.
      </div>

      {/* Progress */}
      <div style={{
        background: 'var(--cs-card)', border: '1px solid var(--cs-border)', borderRadius: 'var(--cs-radius-lg)',
        padding: '16px 18px', marginBottom: 18, boxShadow: 'var(--cs-shadow)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Learning progress</span>
          <span style={{ fontSize: 12, color: 'var(--cs-muted)' }}>{doneCount}/{MODULES.length} modules · {progress}%</span>
        </div>
        <div style={{ height: 8, background: 'var(--cs-surface)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, var(--cs-primary), var(--cs-secondary))', borderRadius: 99, transition: 'width .35s ease' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
        {MODULES.map(m => {
          const done = completedModules.includes(m.id);
          return (
            <button
              key={m.id}
              onClick={() => setSelected(m)}
              className="cs-slide-up"
              style={{
                textAlign: 'left', cursor: 'pointer', background: 'var(--cs-card)',
                border: `1px solid ${done ? 'var(--cs-success)' : 'var(--cs-border)'}`,
                borderRadius: 'var(--cs-radius-lg)', padding: '18px 16px',
                boxShadow: 'var(--cs-shadow)', fontFamily: 'var(--font-sans)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 10, background: `${m.accent}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <i className={`ti ${m.icon}`} style={{ fontSize: 20, color: m.accent }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 650, color: 'var(--cs-text)' }}>{m.title}</span>
                    {done && <i className="ti ti-circle-check-filled" style={{ color: 'var(--cs-success)', fontSize: 15 }} />}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--cs-muted)', lineHeight: 1.45, marginBottom: 10 }}>{m.summary}</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: 'var(--cs-surface)', color: 'var(--cs-muted)' }}>{m.level}</span>
                    <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 20, background: 'var(--cs-surface)', color: 'var(--cs-muted)' }}>
                      <i className="ti ti-clock" style={{ fontSize: 11 }} /> {m.time}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
