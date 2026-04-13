const nodemailer = require('nodemailer');
const fs = require('fs');

const tasks = JSON.parse(fs.readFileSync('tasks.json', 'utf8'));
const pending = tasks.filter(t => !t.done);

if (pending.length === 0) {
  console.log('Aucune tâche en attente, email non envoyé.');
  process.exit(0);
}

const priorityOrder = { high: 0, medium: 1, low: 2 };
const sorted = [...pending].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

const pLabel = { high: 'Urgent', medium: 'Moyen', low: 'Faible' };
const pColor = { high: '#FF3B30', medium: '#FF9500', low: '#34C759' };
const pBg    = { high: '#FFF0EF', medium: '#FFF8EF', low: '#F0FFF4' };

const APP_URL = 'https://napolsg.github.io/taskmail/todo-email.html';

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

const now = new Date().toLocaleString('fr-FR', {
  weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
});

const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; padding:0; background:#F2F2F7; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F2F2F7; padding:32px 16px;">
    <tr><td>
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px; margin:0 auto;">

        <!-- HEADER -->
        <tr>
          <td style="
            background:linear-gradient(135deg,#007AFF,#5B5EA6);
            border-radius:16px 16px 0 0;
            padding:24px 28px;
          ">
            <div style="font-size:22px; font-weight:800; color:white; letter-spacing:-0.5px;">TaskMail</div>
            <div style="font-size:13px; color:rgba(255,255,255,0.8); margin-top:4px;">${now}</div>
          </td>
        </tr>

        <!-- SUMMARY -->
        <tr>
          <td style="background:#007AFF; padding:0 28px 20px;">
            <div style="
              background:rgba(255,255,255,0.15);
              border-radius:10px;
              padding:12px 16px;
              display:inline-block;
            ">
              <span style="font-size:28px; font-weight:800; color:white;">${pending.length}</span>
              <span style="font-size:14px; color:rgba(255,255,255,0.85); margin-left:6px;">tâche${pending.length > 1 ? 's' : ''} en attente</span>
            </div>
          </td>
        </tr>

        <!-- TASKS -->
        <tr>
          <td style="background:white; padding:0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              ${taskRows}
            </table>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="
            background:white;
            border-top:1px solid #F2F2F7;
            border-radius:0 0 16px 16px;
            padding:16px 28px;
            text-align:center;
          ">
            <a href="${APP_URL}" style="
              display:inline-block;
              background:#007AFF;
              color:white;
              text-decoration:none;
              padding:10px 24px;
              border-radius:20px;
              font-size:14px;
              font-weight:700;
            ">Ouvrir TaskMail →</a>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
`;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASSWORD,
  }
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
