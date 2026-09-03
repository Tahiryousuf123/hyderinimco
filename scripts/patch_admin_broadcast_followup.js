import fs from 'fs';

let content = fs.readFileSync('./scripts/build_luxury_theme.js', 'utf8');

// Add states in AdminPortal for broadcast and followup
const stateTarget = `const [waTogglingAi, setWaTogglingAi] = useState(false);`;
const stateReplacement = stateTarget + `
      const [waTogglingFollowUp, setWaTogglingFollowUp] = useState(false);
      const [broadcastMsg, setBroadcastMsg] = useState(
        '🥟 *HYDERI NIMCO & FROZEN — SPECIAL ANNOUNCEMENT* ✨\\n\\n' +
        'Assalam o Alaikum! 🥟\\n' +
        'Hamari 5 Nayi Premium Save Deals aur Fresh Frozen items website par launch ho chuki hain!\\n\\n' +
        '🔥 *Special Offer:* 100% Fresh Samosas, Rolls, Kababs & Hyderi Mix Nimco Express Delivery ke sath ghar mangwaiye.\\n\\n' +
        '🛍️ *Abhi Order Karein:* https://hyderinimco-frozen.com\\n' +
        '📍 North Nazimabad, Karachi (Since 1970)'
      );
      const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
      const [broadcastLog, setBroadcastLog] = useState(null);`;

if (content.includes(stateTarget)) {
  content = content.replace(stateTarget, stateReplacement);
  console.log('SUCCESS: Added broadcast and followup state variables');
}

// Add handleToggleAiFollowUp and handleSendBroadcast functions
const funcTarget = `      const handleToggleAiAutoReply = async () => {
        setWaTogglingAi(true);
        try {
          const res = await fetch('/api/whatsapp/toggle-ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled: waStatus.aiAutoReplyEnabled === false ? true : false })
          });
          const data = await res.json();
          if (data.success) {
            setWaStatus(prev => ({ ...prev, aiAutoReplyEnabled: data.aiAutoReplyEnabled }));
          }
        } catch (e) {
          alert('Failed to toggle AI Auto-Reply');
        } finally {
          setWaTogglingAi(false);
        }
      };`;

const funcReplacement = funcTarget + `

      const handleToggleAiFollowUp = async () => {
        setWaTogglingFollowUp(true);
        try {
          const res = await fetch('/api/whatsapp/toggle-followup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled: waStatus.aiFollowUpEnabled === false ? true : false })
          });
          const data = await res.json();
          if (data.success) {
            setWaStatus(prev => ({ ...prev, aiFollowUpEnabled: data.aiFollowUpEnabled }));
          }
        } catch (e) {
          alert('Failed to toggle AI Follow-Up');
        } finally {
          setWaTogglingFollowUp(false);
        }
      };

      const handleSendBroadcast = async (e) => {
        e.preventDefault();
        if (!broadcastMsg.trim() || isSendingBroadcast) return;

        if (!confirm('Send this WhatsApp broadcast message to all past customers?')) return;

        setIsSendingBroadcast(true);
        setBroadcastLog('⏳ Sending WhatsApp Broadcast messages in background...');

        try {
          const res = await fetch('/api/whatsapp/broadcast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: broadcastMsg })
          });
          const data = await res.json();
          if (data.success) {
            setBroadcastLog(\`✅ Broadcast Complete! Sent: \${data.sentCount} customers. Failed: \${data.failedCount}\`);
          } else {
            setBroadcastLog('❌ Error: ' + (data.error || 'Failed to send broadcast'));
          }
        } catch (err) {
          setBroadcastLog('❌ Broadcast Request Error: ' + err.message);
        } finally {
          setIsSendingBroadcast(false);
        }
      };`;

if (content.includes(funcTarget)) {
  content = content.replace(funcTarget, funcReplacement);
  console.log('SUCCESS: Added handleToggleAiFollowUp & handleSendBroadcast functions');
} else {
  console.error('ERROR: funcTarget not found');
}

fs.writeFileSync('./scripts/build_luxury_theme.js', content, 'utf8');
