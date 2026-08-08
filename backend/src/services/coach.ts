import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';
import { dbAll, dbGet } from '../database';
import { computeStats } from '../utils/badges';

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!config.ai.anthropicApiKey) return null;
  if (!client) client = new Anthropic({ apiKey: config.ai.anthropicApiKey });
  return client;
}

function getUserContext(userId: string) {
  const user = dbGet<{ username: string; xp: number; streak: number }>('SELECT username,xp,streak FROM users WHERE id=?', [userId]);
  const stats = computeStats(userId);
  interface CR { category: string; total: number; passed_count: number }
  const cats = dbAll<CR>('SELECT category,COUNT(*)as total,SUM(passed)as passed_count FROM scenario_results WHERE user_id=? GROUP BY category', [userId]);
  const weakest = [...cats].filter(c => c.total > 0).sort((a, b) => (a.passed_count / a.total) - (b.passed_count / b.total))[0];
  interface FR { category: string; difficulty: string }
  const failures = dbAll<FR>('SELECT category,difficulty FROM scenario_results WHERE user_id=? AND passed=0 ORDER BY completed_at DESC LIMIT 5', [userId]);
  return { user, stats, cats, weakest, failures };
}

function buildSystemPrompt(userId: string): string {
  const { user, stats, cats, weakest, failures } = getUserContext(userId);
  const vulnLines = cats.length > 0
    ? cats.map(c => `- ${c.category}: ${c.total > 0 ? Math.round((c.passed_count / c.total) * 100) : 0}% pass rate (${c.total} attempts)`).join('\n')
    : '- No simulations completed yet';
  const failLines = failures.length > 0 ? failures.map(f => `- ${f.category} (${f.difficulty})`).join('\n') : '- None recently';

  return `You are the CyberSentinel AI Security Coach — a friendly, knowledgeable mentor embedded in a Social Engineering Awareness and Simulation Platform. Your sole purpose is to help "${user?.username ?? 'the user'}" understand and defend against social engineering attacks.

USER SECURITY PROFILE (use to personalise advice — do not simply recite this back):
- XP: ${user?.xp ?? 0} | Streak: ${user?.streak ?? 0} | Modules completed: ${stats.modulesCompleted}/7
- Best quiz score: ${stats.bestQuizPct}%
- Simulation results by category:
${vulnLines}
- Weakest category: ${weakest ? weakest.category : 'not yet determined'}
- Recent failures:
${failLines}

GUIDELINES:
- Be warm, encouraging, and practical. Never condescending about simulation failures.
- Proactively weave in tips for the user's weakest category when relevant.
- Keep answers conversational and focused — short paragraphs over long bullet lists.
- Stay strictly on social engineering, cybersecurity awareness, and digital safety topics.
- Never request real passwords, credentials, or sensitive personal data.
- If the user describes a real suspicious message they received, help them analyse it for red flags and advise reporting it to their real IT/security team — not to you.
- You can reference the 30 simulation scenarios and 7 learning modules in the platform.`;
}

const FOLLOW_UPS: Record<string, string[]> = {
  phishing:   ['How do I spot a spoofed sender domain?', 'What makes phishing emails feel urgent?'],
  vishing:    ['What should I say if a caller asks for my password?', 'How do bank OTP scams work?'],
  smishing:   ['How do I verify a suspicious text message?', 'Why are courier fee SMS scams common?'],
  pretexting: ['How do I verify someone claiming to be IT support?', 'What is payroll diversion fraud?'],
  baiting:    ['Why are USB drops dangerous?', 'What should I do with an unknown USB drive?'],
  physical:   ['How do I politely stop someone tailgating me?', 'What is shoulder surfing?'],
  deepfake:   ['How can I verify a video call is really my manager?', 'How common is voice cloning now?'],
};

/** Offline knowledge-base coach — works without ANTHROPIC_API_KEY for demos / final-year project. */
function offlineCoachReply(userId: string, history: Array<{ role: string; content: string }>): { reply: string; suggestedFollowUps: string[] } {
  const { user, stats, weakest, failures } = getUserContext(userId);
  const lastUser = [...history].reverse().find(m => m.role === 'user')?.content?.toLowerCase() ?? '';
  const name = user?.username ?? 'there';

  type Topic = { keys: string[]; answer: string };
  const topics: Topic[] = [
    {
      keys: ['social engineering', 'what is se', 'what is social'],
      answer: `Social engineering is when attackers manipulate people — not systems — to get information, access, or money. Instead of breaking encryption, they use urgency, fear, authority, or trust.\n\nIn CyberSentinel you practise this across phishing, vishing, smishing, pretexting, baiting, physical access, and deepfakes. The best defence is slowing down, verifying through a channel you already trust, and following process even when someone sounds important.`,
    },
    {
      keys: ['phish', 'email', 'spoof', 'domain', 'sender'],
      answer: `Phishing uses fake emails or sites that look legitimate. Red flags include:\n\n• Sender domain that is close but wrong (e.g. gtbank-verify-ng.com)\n• Urgent threats (“account closes in 2 hours”)\n• Links that do not match the real website when you hover\n• Requests for passwords, OTPs, or bank details by email\n\n**Defend:** never log in from an email link. Open the official app or type the known URL yourself. In Nigeria, bank and “MD transfer” phishing are especially common — treat unexpected payment requests as high risk.`,
    },
    {
      keys: ['vish', 'phone', 'call', 'otp', 'caller'],
      answer: `Vishing is phishing by phone. Attackers often claim to be a bank fraud desk or IT support and ask for an OTP, PIN, or remote access.\n\n**Golden rule:** hang up and call back on the number on your ATM card or official bank app — never a number the caller gives you. No legitimate bank needs your OTP on an inbound call. Sharing an OTP is the same as approving the transfer.`,
    },
    {
      keys: ['smish', 'sms', 'text', 'whatsapp', 'airtime', 'courier', 'gig', 'parcel'],
      answer: `Smishing is phishing via SMS or chat apps. Common Nigerian patterns:\n\n• Courier fee SMS (“pay ₦2,850 to release your parcel”)\n• Fake FIRS/NIMC links asking for TIN/BVN\n• “MD on WhatsApp” asking for airtime or emergency funds\n\n**Defend:** do not tap unexpected links. Check delivery only in the official app. Confirm money requests on a channel you already know is real.`,
    },
    {
      keys: ['pretext', 'impersonat', 'payroll', 'contractor', 'it support'],
      answer: `Pretexting means inventing a believable story to extract data or approval — e.g. a fake contractor, HR payroll change, or supplier with a “new account number”.\n\n**Defend:** verify identity through official channels. Follow change-control for bank details. Urgency + secrecy is a classic attacker combination; slow the process down on purpose.`,
    },
    {
      keys: ['bait', 'usb', 'qr', 'download'],
      answer: `Baiting tempts you with something desirable (USB labelled “Confidential”, free software, a prize QR code) that delivers malware or steals data.\n\n**Defend:** never plug unknown USBs into work machines — give them to IT. Only install software from approved sources. Check QR destinations before entering credentials.`,
    },
    {
      keys: ['tailgat', 'physical', 'shoulder', 'dumpster', 'visitor', 'door'],
      answer: `Physical social engineering includes tailgating (following someone through a secure door), shoulder surfing, dumpster diving, and unsupervised visitors.\n\n**Defend:** everyone badges in individually — politely refuse “hold the door” requests. Use privacy screens in public. Shred confidential paper. Escort visitors; do not leave them alone in open-plan areas.`,
    },
    {
      keys: ['deepfake', 'voice clon', 'ai ', 'video call', 'cfo', 'clone'],
      answer: `AI can clone voices and generate realistic video of executives. Attackers have used deepfake calls to authorise large transfers.\n\n**Defend:** high-risk requests must follow dual approval — a face or voice on a call is not enough. Verify via a second known channel (callback on a stored number). Never send sensitive files to personal email because “the boss asked on a video call”.`,
    },
    {
      keys: ['click', 'link', 'opened', 'fell for', 'compromised', 'hacked'],
      answer: `If you clicked a suspicious link or shared a password/OTP:\n\n1. Disconnect from the network if you installed anything\n2. Change passwords from a clean device (start with email and bank)\n3. Tell your IT/security team immediately — faster is better\n4. Watch statements for unusual transactions\n5. Enable MFA everywhere you can\n\nReporting quickly is the right move, not something to hide.`,
    },
    {
      keys: ['weak', 'worst', 'struggl', 'fail', 'bad at', 'improve', 'help me'],
      answer: weakest
        ? `Looking at your CyberSentinel results, **${weakest.category}** is currently your weakest area (${Math.round((weakest.passed_count / weakest.total) * 100)}% pass rate across ${weakest.total} attempt(s)).\n\nSuggested next steps:\n1. Open the **Learning Hub** module for ${weakest.category}\n2. Complete the remaining **${weakest.category}** simulation scenarios\n3. Ask me specific questions about that attack type\n\nFailures are data — they show where to practise. You have ${user?.xp ?? 0} XP and a streak of ${user?.streak ?? 0}; keep going.`
        : `You have not completed enough simulations yet for me to pinpoint a weak area. Start with the **Phishing** section in Simulations, then try Vishing and Smishing — those are the most common real-world attacks.\n\nAfter a few attempts, your My Report page and I can both give sharper advice.`,
    },
    {
      keys: ['quiz', 'exam', 'test', 'score'],
      answer: `The Knowledge Quiz is a theory check (concepts and red flags). Simulations are different — they put you inside a fake email, call, or chat and ask what you would do.\n\nYour best quiz score so far is **${stats.bestQuizPct}%**. Aim for 70%+. Review Learning Hub modules before retaking. Note: XP is only awarded on your first full quiz attempt.`,
    },
    {
      keys: ['xp', 'badge', 'streak', 'points', 'gamif'],
      answer: `CyberSentinel XP rules:\n\n• Simulations: XP only when you answer **correctly**, and only the **first time** you pass that scenario\n• Wrong answers: **0 XP**\n• Quiz: XP on the **first** full attempt only\n• Reporting a simulated phishing email: bonus XP\n\nYou currently have **${user?.xp ?? 0} XP** and a streak of **${user?.streak ?? 0}**. Streaks reset when you fail a simulation — that encourages careful answers.`,
    },
    {
      keys: ['nigeria', 'naira', 'gtbank', 'uba', 'firs', 'whatsapp', 'md '],
      answer: `Several CyberSentinel scenarios reflect patterns common in Nigeria:\n\n• Bank phishing / “GTBank security alert” emails\n• MD/CEO Naira transfer (business email compromise)\n• UBA-style fraud desk OTP vishing\n• GIG/courier fee smishing\n• FIRS tax suspension SMS\n• MD WhatsApp airtime requests\n• Payroll account diversion\n\nThe principles are universal: verify out-of-band, never share OTPs, and do not bypass approval processes for “urgent confidential” payments.`,
    },
    {
      keys: ['report', 'suspicious', 'real email', 'got a message'],
      answer: `If you received a real suspicious message outside this platform:\n\n1. Do not click links or open attachments\n2. Do not reply with personal data\n3. Report it to your organisation’s IT/security team or the official bank channel\n4. You can still describe the red flags here and I will help you analyse the pattern\n\nI cannot report it for you — always use your real internal reporting path.`,
    },
  ];

  let matched: Topic | undefined;
  for (const t of topics) {
    if (t.keys.some(k => lastUser.includes(k))) { matched = t; break; }
  }

  let reply: string;
  if (matched) {
    reply = `Hi ${name} — ${matched.answer}`;
  } else if (!lastUser.trim()) {
    reply = `Hi ${name}! I am your CyberSentinel security coach. Ask me about phishing, vishing, smishing, deepfakes, OTPs, or your weakest areas — I will keep answers practical.`;
  } else {
    reply = `Hi ${name}. I can help with social engineering topics: phishing, phone/SMS scams, pretexting, baiting, physical security, deepfakes, OTPs, XP rules, and how to improve from your simulation results.\n\nTry asking something like “How do I spot a phishing email?” or “What is my weakest area?”`;
  }

  // Soft personalisation footer when we have failure data
  if (failures.length > 0 && matched && !lastUser.includes('weak')) {
    reply += `\n\n_Based on your recent practice, also review: ${failures.slice(0, 2).map(f => f.category).join(', ')}._`;
  }

  const suggestedFollowUps = weakest
    ? (FOLLOW_UPS[weakest.category] ?? ['What is social engineering?', 'How do I spot a phishing email?'])
    : ['What is social engineering?', 'How do I spot a phishing email?', 'What should I do if I clicked a bad link?'];

  return { reply, suggestedFollowUps };
}

export async function getCoachReply(
  userId: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<{ reply: string; suggestedFollowUps: string[]; mode: 'live' | 'offline' }> {
  const anthropic = getClient();

  // Live Anthropic path when API key is configured
  if (anthropic) {
    try {
      const response = await anthropic.messages.create({
        model: config.ai.model,
        max_tokens: config.ai.maxTokens,
        system: buildSystemPrompt(userId),
        messages: history.map(m => ({ role: m.role, content: m.content })),
      });
      const textBlock = response.content.find(b => b.type === 'text');
      const reply = textBlock && textBlock.type === 'text'
        ? textBlock.text
        : "Sorry, I could not generate a response right now — please try again.";

      const { weakest } = getUserContext(userId);
      const suggestedFollowUps = weakest
        ? (FOLLOW_UPS[weakest.category] ?? [])
        : ['What is social engineering?', 'How do I start improving my security awareness?'];
      return { reply, suggestedFollowUps, mode: 'live' };
    } catch (err) {
      console.error('[Coach] Anthropic error, falling back to offline mode:', (err as Error).message);
      const offline = offlineCoachReply(userId, history);
      return { ...offline, mode: 'offline' };
    }
  }

  // No API key — offline coach (fully functional for project demos)
  const offline = offlineCoachReply(userId, history);
  return { ...offline, mode: 'offline' };
}
