import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function StrikeCopilot({ user, players = [], sessions = [], matches = [] }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [speakingIdx, setSpeakingIdx] = useState(null);
  const nav = useNavigate();
  const chatBottomRef = useRef(null);

  const readyPlayers = players.filter(p => p.attendance >= 75 && p.matches >= 2);

  const initialMessages = [
    {
      sender: 'assistant',
      text: `👋 Hello ${user ? user.name?.split(' ')[0] : 'there'}! I'm your TruPlay AI Copilot.\n\nNeed help navigating the academy, marking biometric anti-proxy attendance, or checking match readiness? Ask me anything or tap one of the quick questions below!`,
      actions: [
        { label: '🛡️ How biometric attendance works', path: '/sessions' },
        { label: '🎯 Am I Match Ready?', path: '/readiness' },
        { label: '🔒 What is Biometric Passkey?', path: '/dashboard' }
      ]
    }
  ];

  const [messages, setMessages] = useState(initialMessages);

  useEffect(() => {
    if (open && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  function speak(text, idx) {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported in this browser.');
      return;
    }
    if (speakingIdx === idx) {
      window.speechSynthesis.cancel();
      setSpeakingIdx(null);
      return;
    }
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#_~`✓×●👉📋🎯⚽🔒👥📊⚡🛡️]/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.onend = () => setSpeakingIdx(null);
    utterance.onerror = () => setSpeakingIdx(null);
    setSpeakingIdx(idx);
    window.speechSynthesis.speak(utterance);
  }

  function generateAnswer(query) {
    const q = query.toLowerCase();

    // Biometric attendance & Anti-Proxy questions
    if (q.includes('fals') || q.includes('proxy') || q.includes('fake') || q.includes('biometric') || q.includes('scan') || q.includes('attend') || q.includes('present') || q.includes('session')) {
      return {
        text: `🛡️ **Biometric Anti-Proxy Attendance:**\nTruPlay completely eliminates false attendance using hardware passkeys:\n1. In **Sessions**, click **◎ Biometric Scan** next to each player.\n2. The player scans their physical fingerprint, Touch ID, Face ID, or Windows Hello on the spot.\n3. The scan creates a tamper-proof cryptographic signature (\`BIO-XXXX\`) and marks them **🛡️ Biometric Verified**.\n4. Manual marks without biometric proof are visibly flagged as **⚠️ Manual (Proxy Risk)** so coaches and scouts immediately spot buddy attendance!\n5. Click **Close session & lock anti-proxy record** to seal the session forever.`,
        actions: [
          { label: '📋 Open Sessions & Scan', path: '/sessions' },
          { label: '🎯 View Match Readiness', path: '/readiness' }
        ]
      };
    }

    // Match readiness questions
    if (q.includes('ready') || q.includes('eligib') || q.includes('qualif') || q.includes('selection') || q.includes('khel') || q.includes('rule')) {
      return {
        text: `🎯 **Match Readiness Criteria:**\nTo be eligible for tournament selection in TruPlay, players must meet two honest rules:\n1. **Attendance ≥ 75%** verified across held sessions.\n2. **Matches Played ≥ 2** recorded appearances.\n\n📊 **Current Academy Status:**\nCurrently **${readyPlayers.length} out of ${players.length} players** meet both conditions and are eligible for selection!`,
        actions: [
          { label: '👉 Open Readiness Board', path: '/readiness' },
          { label: '👥 View Players Roster', path: '/players' }
        ]
      };
    }

    // Passkey setup & login
    if (q.includes('passkey') || q.includes('login') || q.includes('sign in') || q.includes('auth')) {
      return {
        text: `🔒 **Biometric Passkey Authentication:**\n- TruPlay uses **WebAuthn passkeys** (Windows Hello, Touch ID, Apple Face ID, or Android screen lock).\n- **Why passkeys?** They prevent password sharing and fake proxy attendance.\n- **How to register:** In your Dashboard, click **◎ Register Biometric Passkey** to pair your physical device. After setup, you can sign in with your fingerprint or face in seconds!`,
        actions: [
          { label: '⚡ Go to Dashboard', path: '/dashboard' },
          { label: '🔐 Go to Login / Auth', path: '/auth' }
        ]
      };
    }

    // Matches and fixtures
    if (q.includes('match') || q.includes('fixture') || q.includes('game') || q.includes('score') || q.includes('opponent')) {
      return {
        text: `⚽ **Matches & Fixtures:**\n- Track upcoming tournament games and past results against rival academies.\n- Coaches can click **＋ Add match** to record scores and opponents.\n- Each match played counts directly towards player match readiness!`,
        actions: [
          { label: '⚽ Go to Matches', path: '/matches' }
        ]
      };
    }

    // Players questions
    if (q.includes('player') || q.includes('roster') || q.includes('add player') || q.includes('squad') || q.includes('search')) {
      return {
        text: `👥 **Player Roster:**\n- View all enrolled athletes, their sports, verified attendance percentage, and match readiness badges.\n- Coaches can click **＋ Add player** to register new athletes and track their progress from day one.`,
        actions: [
          { label: '👥 View Players Roster', path: '/players' }
        ]
      };
    }

    // Hindi / Hinglish query support
    if (q.includes('kaise') || q.includes('kya hai') || q.includes('batao') || q.includes('madad') || q.includes('karo') || q.includes('naam')) {
      return {
        text: `🇮🇳 **TruPlay Academy Guide (Hindi/Hinglish):**\n- **Naam:** TruPlay (True + Play) — iska matlab hai bina jhoothi attendance ke sachha sports tracking!\n- **False attendance kaise rokein:** 'Sessions' me jakar 'Biometric Scan' par click karein. Player apna fingerprint ya face scan karega aur '🛡️ Biometric Verified' stamp lag jayega.\n- **Match Ready kaise banein:** Kam se kam 75% verified attendance aur 2 matches khelna zaroori hai.`,
        actions: [
          { label: '📋 Open Sessions', path: '/sessions' },
          { label: '🎯 Check Readiness', path: '/readiness' }
        ]
      };
    }

    // General help / App overview
    return {
      text: `💡 **TruPlay Academy Features:**\n- 🛡️ **Biometric Anti-Proxy:** Hardware scan prevents buddy check-ins and false attendance.\n- 📊 **Dashboard:** Real-time squad readiness and biometric audit logs.\n- 👥 **Players:** Full academy roster and verified attendance records.\n- 📋 **Sessions:** Practice tracking with tamper-proof locked records.\n- ⚽ **Matches:** Fixture schedules, opponents, and score history.\n- 🎯 **Readiness:** Automatic 75% attendance + 2 matches qualification engine.\n\nWhere would you like to navigate right now?`,
      actions: [
        { label: '📋 Practice Sessions', path: '/sessions' },
        { label: '🎯 Match Readiness', path: '/readiness' },
        { label: '📊 Dashboard', path: '/dashboard' },
        { label: '⚽ Matches', path: '/matches' }
      ]
    };
  }

  function handleSend(textToSend) {
    const query = textToSend || input;
    if (!query.trim()) return;

    const userMessage = { sender: 'user', text: query };
    const responseData = generateAnswer(query);
    const botMessage = {
      sender: 'assistant',
      text: responseData.text,
      actions: responseData.actions
    };

    setMessages(prev => [...prev, userMessage, botMessage]);
    setInput('');
  }

  function handleChipClick(chipText) {
    handleSend(chipText);
  }

  function handleActionClick(path) {
    if (path) {
      nav(path);
      if (window.innerWidth < 700) {
        setOpen(false);
      }
    }
  }

  return (
    <>
      {/* Floating Copilot Launcher Button */}
      <div className="copilot-launcher">
        <button
          className="copilot-trigger"
          onClick={() => setOpen(!open)}
          aria-label="Toggle TruPlay Copilot AI"
          title="Need help or have questions? Click for Copilot AI!"
        >
          <span style={{ fontSize: '18px' }}>🤖</span>
          <span>TruPlay Copilot</span>
          <span className="copilot-badge">AI</span>
        </button>
      </div>

      {/* Floating Copilot Chat & Help Panel */}
      {open && (
        <aside className="copilot-panel" role="dialog" aria-label="TruPlay Copilot AI Assistant">
          {/* Header */}
          <div className="copilot-header">
            <div className="copilot-header-info">
              <div className="copilot-avatar">🛡️</div>
              <div>
                <h4>TruPlay Copilot <span style={{ color: 'var(--lime)', fontSize: '12px' }}>AI</span></h4>
                <p>Anti-proxy guide & academy assistant</p>
              </div>
            </div>
            <button
              className="copilot-close"
              onClick={() => {
                if (window.speechSynthesis) window.speechSynthesis.cancel();
                setSpeakingIdx(null);
                setOpen(false);
              }}
              title="Close Copilot"
            >
              ✕
            </button>
          </div>

          {/* Quick Prompt Chips */}
          <div className="copilot-quick-bar">
            <button className="copilot-chip" onClick={() => handleChipClick('How does biometric attendance prevent false attendance?')}>
              🛡️ Stop False Attendance
            </button>
            <button className="copilot-chip" onClick={() => handleChipClick('Am I match ready?')}>
              🎯 Match Readiness
            </button>
            <button className="copilot-chip" onClick={() => handleChipClick('How to setup biometric passkey?')}>
              🔒 Biometric Passkey
            </button>
            <button className="copilot-chip" onClick={() => handleChipClick('Tell me about upcoming matches')}>
              ⚽ Match Fixtures
            </button>
            <button className="copilot-chip" onClick={() => handleChipClick('Hindi me batao')}>
              🇮🇳 हिंदी में मदद
            </button>
          </div>

          {/* Chat Messages Body */}
          <div className="copilot-body">
            {messages.map((m, i) => (
              <div key={i} className={`copilot-msg ${m.sender}`}>
                <div className="copilot-msg-bubble">
                  {m.text.split('\n').map((line, lineIdx) => (
                    <div key={lineIdx} style={{ minHeight: line ? 'auto' : '8px' }}>
                      {line}
                    </div>
                  ))}

                  {/* Action Shortcuts */}
                  {m.actions && m.actions.length > 0 && (
                    <div className="copilot-msg-actions">
                      {m.actions.map((act, actIdx) => (
                        <button
                          key={actIdx}
                          className="copilot-action-btn"
                          onClick={() => handleActionClick(act.path)}
                        >
                          {act.label} ↗
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Speak button for assistant responses */}
                {m.sender === 'assistant' && (
                  <button
                    className="copilot-speak-btn"
                    onClick={() => speak(m.text, i)}
                    title={speakingIdx === i ? 'Stop speaking' : 'Listen to this message'}
                  >
                    {speakingIdx === i ? '⏹ Stop audio' : '🔊 Listen / Read aloud'}
                  </button>
                )}
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>

          {/* Input Bar */}
          <form
            className="copilot-input-bar"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <input
              type="text"
              placeholder="Ask anything (e.g. how biometric check-in works)..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit" className="copilot-send-btn" title="Send message">
              ➤
            </button>
          </form>
        </aside>
      )}
    </>
  );
}
