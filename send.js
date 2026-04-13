const nodemailer = require('nodemailer');
const fs = require('fs');

const tasks = JSON.parse(fs.readFileSync('tasks.json', 'utf8'));
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const pending = tasks.filter(t => !t.done);

// Vérifie si c'est l'heure d'envoyer
const now = new Date();
const hhmm = now.getUTCHours().toString().padStart(2,'0') + ':' + now.getUTCMinutes().toString().padStart(2,'0');

// Convertit les horaires locaux (Paris) en UTC
function toUTC(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const offset = isDST() ? 2 : 1; // UTC+2 été, UTC+1 hiver
  let utcH = h - offset;
  if (utcH < 0) utcH += 24;
  return utcH.toString().padStart(2,'0') + ':' + m.toString().padStart(2,'0');
}

function isDST() {
  const jan = new Date(now.getFullYear(), 0, 1).getTimezoneOffset();
  const jul = new Date(now.getFullYear(), 6, 1).getTimezoneOffset();
  return now.getTimezoneOffset() < Math.max(jan, jul);
}

const schedulesUTC = (config.schedules || []).map(toUTC);
const shouldSend = schedulesUTC.some(s => {
  const [h, m] = s.split(':').map(Number);
  return now.getUTCHours() === h && now.getUTCMinutes() < 15; // fenêtre de 15 min
});

if (!shouldSend && process.env.FORCE !== 'true') {
  console.log(`Pas l'heure d'envoyer (${hhmm} UTC, horaires : ${schedulesUTC.join(', ')})`);
  process.exit(0);
}

if (pending.length === 0) {
  console.log('Aucune tâche en attente, email non envoyé.');
  process.exit(0);
}

const priorityOrder = { high: 0, medium: 1, low: 2 };
const sorted = [...pending].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

const pLabel = { high: 'Urgent', medium: 'Moyen', low: 'Faible' };
const pColor = { high: '#A32D2D', medium: '#854F0B', low: '#3B6D11' };
const pBg    = { high: '#FCEBEB', medium: '#FAEEDA', low: '#EAF3DE' };

const APP_URL = 'https://napolsg.github.io/taskmail-MA/todo-email-2.html';

const taskRows = sorted.map(t => `
  <tr>
    <td style="padding:12px 16px; border-bottom:1px solid #F2F2F7;">
      <div style="display:flex; align-items:center; gap:10px;">
        <span style="
          display:inline-block;
          background:${pBg[t.priority]};
          color:${pColor[t.priority]};
          font-size:11px;
          font-weight:700;
          padding:2px 8px;
          border-radius:20px;
          white-space:nowrap;
        ">${pLabel[t.priority]}</span>
        <span style="font-size:14px; color:#1C1C1E; font-weight:500;">${t.title}</span>
        ${t.project ? `<span style="font-size:11px; color:#8E8E93; margin-left:4px;">— ${t.project}</span>` : ''}
      </div>
    </td>
  </tr>
`).join('');

const dateStr = now.toLocaleString('fr-FR', {
  weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  timeZone: 'Europe/Paris'
});

const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; padding:0; background:#F2F2F7; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F2F2F7; padding:32px 16px;">
    <tr><td>
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px; margin:0 auto;">
        <tr>
          <td style="background:#185FA5; border-radius:16px 16px 0 0; padding:24px 28px 0;">
            <div style="font-size:22px; font-weight:800; color:#E6F1FB;">TaskMail</div>
            <div style="font-size:13px; color:#85B7EB; margin-top:4px; padding-bottom:20px;">${dateStr}</div>
          </td>
        </tr>
        <tr>
          <td style="background:#185FA5; padding:0 28px 20px;">
            <div style="background:rgba(255,255,255,0.15); border-radius:10px; padding:12px 16px; display:inline-block;">
              <span style="font-size:28px; font-weight:800; color:#E6F1FB;">${pending.length}</span>
              <span style="font-size:14px; color:#B5D4F4; margin-left:6px;">tâche${pending.length > 1 ? 's' : ''} en attente</span>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:white; padding:0;">
            <table width="100%" cellpadding="0" cellspacing="0">${taskRows}</table>
          </td>
        </tr>
        <tr>
          <td style="background:white; border-top:1px solid #F2F2F7; border-radius:0 0 16px 16px; padding:16px 28px; text-align:center;">
            <a href="${APP_URL}" style="display:inline-block; background:#185FA5; color:#E6F1FB; text-decoration:none; padding:10px 24px; border-radius:20px; font-size:14px; font-weight:700;">Ouvrir TaskMail →</a>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASSWORD }
});

transporter.sendMail({
  from: `TaskMail <${process.env.GMAIL_USER}>`,
  to: process.env.GMAIL_USER,
  subject: `📋 TaskMail — ${pending.length} tâche${pending.length > 1 ? 's' : ''} à faire`,
  html,
}, (err, info) => {
  if (err) { console.error('Erreur :', err); process.exit(1); }
  console.log('Email envoyé :', info.response);
});
