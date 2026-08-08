import React, { useState } from 'react';
import { quizApi } from '../api/client';
import { showToast } from '../components/layout/AppShell';

interface Question {
  id: number;
  q: string;
  opts: string[];
  correct: number;
  exp: string;
}

const QUESTIONS: Question[] = [
  { id: 0, q: 'An email claims your bank account will be frozen unless you click a link within 2 hours. What should you do?', opts: ['Click the link immediately to protect your account', 'Call your bank using the number on the back of your card', 'Reply to the email asking for more information', 'Forward it to a colleague for their opinion'], correct: 1, exp: 'Always verify by calling the official number — never through a link in a suspicious email. Urgency is a manipulation tactic.' },
  { id: 1, q: 'Which domain is most likely a phishing attempt?', opts: ['login.microsoft.com', 'accounts.google.com', 'micros0ft-secure.net', 'support.apple.com'], correct: 2, exp: '"Micros0ft" uses a zero instead of the letter O — typosquatting to look legitimate at a glance. The .net TLD and hyphen are also red flags.' },
  { id: 2, q: "A caller says they're from IT and needs your password to fix a critical issue. You should:", opts: ['Provide the password since they\'re from IT', 'Give the first half and make them guess the second', 'Refuse and offer to call IT back on the official number', 'Change your password first then tell them the new one'], correct: 2, exp: 'Legitimate IT staff never need your password. They have administrator access. Always hang up and call back on the official helpdesk number.' },
  { id: 3, q: 'You find a USB drive in the office car park labelled "Q1 Salary Data." What do you do?', opts: ['Plug it in on an isolated machine to check its contents', 'Hand it to IT security without plugging it in', 'Try it at home on your personal laptop', 'Leave it where it is'], correct: 1, exp: 'USB drops are a classic baiting attack. Hand it to IT — never plug it in, even on an isolated machine, as firmware attacks bypass OS controls.' },
  { id: 4, q: 'Which of these is an example of pretexting?', opts: ['Sending a mass email claiming your account is suspended', 'An attacker posing as an IT auditor to gain network access', 'Leaving an infected USB drive in a reception area', 'Watching someone type a password over their shoulder'], correct: 1, exp: 'Pretexting involves creating a fabricated scenario and identity (like "IT auditor") to manipulate a target over time.' },
  { id: 5, q: 'What is "spear phishing"?', opts: ['Phishing using fishing metaphors in the email', 'A targeted phishing attack using personal details about the victim', 'Phishing via SMS text messages', 'An attack that goes through multiple layers of email filters'], correct: 1, exp: 'Spear phishing is highly targeted — the attacker researches the victim\'s name, role, and contacts to create convincing personalised emails.' },
  { id: 6, q: 'Your CEO sends an urgent WhatsApp message asking you to buy £500 in gift cards for a client meeting. You should:', opts: ['Buy the cards — your CEO asked directly', 'Call your CEO on their known number to verify', 'Reply asking for the receipts address', 'Send the cards to the number that messaged you'], correct: 1, exp: 'This is a classic "gift card scam" using impersonation. CEO accounts are often compromised or spoofed. Always verify via a known, pre-existing channel.' },
  { id: 7, q: 'How can you tell a URL is suspicious before clicking it?', opts: ['The email has a company logo', 'The link is underlined and blue', "Hovering shows a domain that doesn't match the supposed sender", 'The email is addressed to your full name'], correct: 2, exp: 'Always hover over links before clicking. The actual URL in the status bar often reveals typosquatted or unrelated domains.' },
  { id: 8, q: 'What is "tailgating" in physical security?', opts: ["Following a colleague's browsing history remotely", 'Walking through a secure door by following an authorised person', 'Sending an email that impersonates a senior executive', 'Installing monitoring software on a laptop in the office'], correct: 1, exp: 'Tailgating (or "piggybacking") means using social pressure to follow someone through a secure entrance without proper authentication.' },
  { id: 9, q: "You receive an email that passed spam filters, uses your name, your manager's name, and mentions a real project. It asks you to open an attachment urgently. What is this most likely?", opts: ['A routine internal communication', 'A spear phishing attack using OSINT', 'An automated IT system notification', 'A legal document requiring immediate signature'], correct: 1, exp: 'Attackers use OSINT (LinkedIn, social media, company websites) to craft highly personalised spear phishing emails that bypass generic spam filters.' },
];

type Phase = 'intro' | 'quiz' | 'result';

interface Answer { questionId: number; chosen: number; correct: boolean; }

export default function QuizPage() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [chosen, setChosen] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ pct: number; grade: string; xpEarned: number } | null>(null);

  const s = (style = {}) => ({ fontFamily: 'var(--font-sans)', ...style });
  const card = { background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', padding: 20 };

  const startQuiz = () => { setPhase('quiz'); setIdx(0); setAnswers([]); setChosen(null); };

  const selectAnswer = (optIdx: number) => {
    if (chosen !== null) return;
    setChosen(optIdx);
  };

  const nextQuestion = async () => {
    const q = QUESTIONS[idx];
    const isCorrect = chosen === q.correct;
    const newAnswers = [...answers, { questionId: q.id, chosen: chosen!, correct: isCorrect }];
    setAnswers(newAnswers);

    if (idx < QUESTIONS.length - 1) {
      setIdx(idx + 1);
      setChosen(null);
    } else {
      // Submit quiz
      setSubmitting(true);
      const score = newAnswers.filter(a => a.correct).length;
      try {
        const res = await quizApi.submit(score, QUESTIONS.length, newAnswers);
        setResult({ pct: res.pct, grade: res.grade, xpEarned: res.xpEarned });
        if (res.newBadges.length > 0) res.newBadges.forEach(b => showToast(`Badge unlocked: ${b.label}`, 'badge'));
        showToast(`Quiz complete! ${score}/${QUESTIONS.length} correct` + (res.xpEarned > 0 ? '' : ' (retake — no XP)'), 'success', res.xpEarned > 0 ? res.xpEarned : undefined);
      } catch (e) {
        showToast((e as Error).message, 'error');
      } finally {
        setSubmitting(false);
        setPhase('result');
      }
    }
  };

  if (phase === 'intro') return (
    <div style={s()}>
      <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 2 }}>Knowledge Quiz</div>
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 8 }}>Theory questions that test what you know — not interactive attack scenarios.</div>
      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 16 }}>Simulations put you inside a fake email or call. This quiz is a short written exam on concepts, red flags, and best responses.</div>
      <div style={{ ...card, maxWidth: 480 }}>
        <div style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 16 }}>
          This assessment covers phishing, vishing, pretexting, baiting, and general security awareness. <strong>10 questions</strong>, no time limit.
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {[{ label: '10 questions', icon: 'ti-list' }, { label: '~5 minutes', icon: 'ti-clock' }, { label: 'XP on first attempt only', icon: 'ti-star' }].map(b => (
            <span key={b.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
              <i className={`ti ${b.icon}`} /> {b.label}
            </span>
          ))}
        </div>
        <button onClick={startQuiz} style={s({ padding: '10px 20px', fontSize: 13, fontWeight: 500, cursor: 'pointer', background: 'var(--color-text-primary)', color: 'var(--color-background-primary)', border: 'none', borderRadius: 'var(--border-radius-md)' })}>
          <i className="ti ti-player-play" /> Start assessment
        </button>
      </div>
    </div>
  );

  if (phase === 'result') {
    const score = answers.filter(a => a.correct).length;
    const pct = result?.pct ?? 0;
    const color = pct >= 80 ? 'var(--color-text-success)' : pct >= 60 ? 'var(--color-text-warning)' : 'var(--color-text-danger)';
    return (
      <div style={s()}>
        <div style={{ fontSize: 17, fontWeight: 500, marginBottom: 16 }}>Quiz Result</div>
        <div style={{ ...card, maxWidth: 480, textAlign: 'center' }}>
          <svg width="100" height="100" viewBox="0 0 100 100" style={{ display: 'block', margin: '0 auto 12px' }}>
            <circle cx="50" cy="50" r="42" fill="none" stroke="var(--color-border-tertiary)" strokeWidth="7" />
            <circle cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
              strokeDasharray="264" strokeDashoffset={264 * (1 - pct / 100)} transform="rotate(-90 50 50)" />
            <text x="50" y="50" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 20, fontWeight: 600, fill: 'var(--color-text-primary)' }}>{pct}%</text>
          </svg>
          <div style={{ fontSize: 22, fontWeight: 500, color }}>{score}/{QUESTIONS.length} correct</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4, marginBottom: 8 }}>
            Grade: <strong>{result?.grade}</strong> · {(result?.xpEarned ?? 0) > 0 ? `+${result!.xpEarned} XP earned` : 'No XP on retake'}
          </div>
          <div style={{ fontSize: 13, marginBottom: 20 }}>
            {pct >= 80 ? '🎉 Outstanding! You have excellent security awareness.' : pct >= 60 ? '👍 Good — review the questions you missed.' : '📚 Keep learning — revisit the Learning Hub and try again.'}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button onClick={startQuiz} style={s({ padding: '9px 16px', fontSize: 12, fontWeight: 500, cursor: 'pointer', background: 'var(--color-text-primary)', color: 'var(--color-background-primary)', border: 'none', borderRadius: 'var(--border-radius-md)' })}>
              Retake quiz
            </button>
          </div>
        </div>
        {/* Answer review */}
        <div style={{ marginTop: 16, fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Answer review</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 560 }}>
          {QUESTIONS.map((q, i) => {
            const ans = answers[i];
            if (!ans) return null;
            return (
              <div key={q.id} style={{ ...card, padding: '14px 16px', borderLeft: `3px solid ${ans.correct ? 'var(--color-text-success)' : 'var(--color-text-danger)'}` }}>
                <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>Q{i + 1}: {q.q}</div>
                <div style={{ fontSize: 12, color: ans.correct ? 'var(--color-text-success)' : 'var(--color-text-danger)', marginBottom: 4 }}>
                  {ans.correct ? '✓ Correct' : `✗ You chose: "${q.opts[ans.chosen]}"`}
                </div>
                {!ans.correct && <div style={{ fontSize: 11, color: 'var(--color-text-success)' }}>Correct answer: "{q.opts[q.correct]}"</div>}
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 4, background: 'var(--color-background-secondary)', padding: '6px 10px', borderRadius: 6 }}>{q.exp}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Active quiz
  const q = QUESTIONS[idx];
  return (
    <div style={s({ maxWidth: 560 })}>
      <div style={{ fontSize: 17, fontWeight: 500, marginBottom: 12 }}>Question {idx + 1} of {QUESTIONS.length}</div>
      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 16 }}>
        {QUESTIONS.map((_, i) => (
          <div key={i} style={{ height: 5, flex: 1, borderRadius: 3, background: i < idx ? (answers[i]?.correct ? 'var(--color-text-success)' : 'var(--color-text-danger)') : i === idx ? 'var(--color-text-primary)' : 'var(--color-border-tertiary)', opacity: i < idx ? 0.7 : 1 }} />
        ))}
      </div>
      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.5, marginBottom: 16 }}>{q.q}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {q.opts.map((opt, i) => {
            let bg = 'var(--color-background-primary)';
            let border = 'var(--color-border-secondary)';
            let color = 'var(--color-text-primary)';
            if (chosen !== null) {
              if (i === q.correct) { bg = 'var(--color-background-success)'; border = 'var(--color-border-success)'; color = 'var(--color-text-success)'; }
              else if (i === chosen && chosen !== q.correct) { bg = 'var(--color-background-danger)'; border = 'var(--color-border-danger)'; color = 'var(--color-text-danger)'; }
            }
            return (
              <button key={i} onClick={() => selectAnswer(i)} disabled={chosen !== null}
                style={s({ width: '100%', textAlign: 'left', padding: '12px 14px', fontSize: 13, cursor: chosen !== null ? 'default' : 'pointer', background: bg, border: `0.5px solid ${border}`, borderRadius: 'var(--border-radius-md)', color })}>
                <span style={{ fontWeight: 500, marginRight: 8, color: 'var(--color-text-secondary)' }}>{String.fromCharCode(65 + i)}.</span>{opt}
              </button>
            );
          })}
        </div>
        {chosen !== null && (
          <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 'var(--border-radius-md)', background: 'var(--color-background-secondary)', fontSize: 12, lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
            <strong>Explanation:</strong> {q.exp}
          </div>
        )}
      </div>
      {chosen !== null && (
        <button onClick={nextQuestion} disabled={submitting}
          style={s({ float: 'right', padding: '9px 18px', fontSize: 13, fontWeight: 500, cursor: submitting ? 'not-allowed' : 'pointer', background: 'var(--color-text-primary)', color: 'var(--color-background-primary)', border: 'none', borderRadius: 'var(--border-radius-md)', opacity: submitting ? 0.6 : 1 })}>
          {submitting ? 'Saving…' : idx < QUESTIONS.length - 1 ? 'Next →' : 'Finish quiz'}
        </button>
      )}
    </div>
  );
}
