/**
 * ============================================================================
 * DESIGN STUDIO • LUXURY CELEBRATION PLATFORM BACKEND SERVER
 * Express + RESTful API + Persistent File DB + Multer Uploads + Nodemailer
 * ============================================================================
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Directories
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, 'data');
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/src', express.static(path.join(ROOT_DIR, 'src')));
app.use('/assets', express.static(path.join(ROOT_DIR, 'assets')));
app.use(express.static(ROOT_DIR));

// Database Helper
function readJsonFile(filename, defaultVal = {}) {
  const filePath = path.join(DATA_DIR, filename);
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultVal, null, 2), 'utf8');
      return defaultVal;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${filename}:`, err);
    return defaultVal;
  }
}

function writeJsonFile(filename, data) {
  const filePath = path.join(DATA_DIR, filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filename}:`, err);
    return false;
  }
}

// Multer Storage Configuration for Audio & Photos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const cleanExt = path.extname(file.originalname).toLowerCase() || '.bin';
    const baseName = path.basename(file.originalname, cleanExt).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, `${baseName}-${uniqueSuffix}${cleanExt}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 60 * 1024 * 1024 } // 60MB max
});

// Nodemailer Transporter Setup with Auto-Fallback
let mailTransporter = null;

async function getMailTransporter() {
  if (mailTransporter) return mailTransporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    mailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });
    return mailTransporter;
  }

  // Fallback to test ethereal account for zero-config testing
  try {
    const testAccount = await nodemailer.createTestAccount();
    mailTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      },
      tls: {
        rejectUnauthorized: false
      }
    });
    console.log('✉️  Ethereal Test SMTP initialized:', testAccount.user);
    return mailTransporter;
  } catch (err) {
    console.warn('Could not create Ethereal test account:', err);
    return null;
  }
}

// ============================================================================
// 1. HEALTH & SYSTEM STATUS
// ============================================================================
app.get('/api/health', (req, res) => {
  const events = readJsonFile('events.json', {});
  res.json({
    status: 'online',
    platform: 'Design Studio Luxury Platform',
    version: '2.5.0',
    timestamp: new Date().toISOString(),
    activeEventsCount: Object.keys(events).length
  });
});

// ============================================================================
// 2. EVENTS CMS API (MULTI-TENANT)
// ============================================================================
app.get('/api/events', (req, res) => {
  const events = readJsonFile('events.json', {});
  const slugs = Object.keys(events);
  if (!slugs.includes('master_default')) slugs.unshift('master_default');
  res.json({ success: true, slugs, events });
});

app.post('/api/events', (req, res) => {
  const { slug, eventName, organizerEmail, organizerPassword, protagonistName } = req.body;
  if (!slug) {
    return res.status(400).json({ success: false, message: 'Slug is required.' });
  }

  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
  const events = readJsonFile('events.json', {});

  const token = 'token_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  const existing = events[cleanSlug] || {};
  const newEventConfig = {
    ...existing,
    slug: cleanSlug,
    eventName: eventName || existing.eventName || 'Private Celebration Gala',
    protagonistName: protagonistName || existing.protagonistName || 'Celebrant',
    protagonistMonogram: (protagonistName ? protagonistName.slice(0, 2).toUpperCase() : (existing.protagonistMonogram || 'VIP')),
    milestoneTitle: (eventName || existing.milestoneTitle || 'PRIVATE GALA').toUpperCase(),
    organizerEmail: organizerEmail || existing.organizerEmail || 'organizer@luxury.com',
    updatedAt: new Date().toISOString(),
    createdAt: existing.createdAt || new Date().toISOString()
  };

  events[cleanSlug] = newEventConfig;
  writeJsonFile('events.json', events);

  if (organizerEmail) {
    const admins = readJsonFile('admins.json', []);
    const existingAdminIdx = admins.findIndex(a => (a.email || '').toLowerCase() === organizerEmail.toLowerCase());
    if (existingAdminIdx >= 0) {
      if (!admins[existingAdminIdx].assignedSlugs.includes(cleanSlug)) {
        admins[existingAdminIdx].assignedSlugs.push(cleanSlug);
      }
    } else {
      admins.push({
        email: organizerEmail,
        password: organizerPassword || 'admin123',
        role: 'admin',
        assignedSlugs: [cleanSlug],
        inviteToken: token,
        createdAt: new Date().toISOString()
      });
    }
    writeJsonFile('admins.json', admins);
  }

  res.json({
    success: true,
    slug: cleanSlug,
    inviteToken: token,
    config: newEventConfig
  });
});

app.get('/api/events/:slug', (req, res) => {
  const slug = req.params.slug || 'master_default';
  const events = readJsonFile('events.json', {});
  const config = events[slug] || null;
  res.json({ success: true, slug, config });
});

app.post('/api/events/create', (req, res) => {
  const { slug, eventName, organizerEmail, organizerPassword, protagonistName } = req.body;
  if (!slug || !organizerEmail) {
    return res.status(400).json({ success: false, message: 'Slug and organizer email are required.' });
  }

  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
  const events = readJsonFile('events.json', {});

  if (events[cleanSlug]) {
    return res.status(400).json({ success: false, message: `Event slug "${cleanSlug}" already exists.` });
  }

  const token = 'token_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  const newEventConfig = {
    slug: cleanSlug,
    eventName: eventName || 'Private Celebration Gala',
    protagonistName: protagonistName || 'Celebrant',
    protagonistMonogram: (protagonistName ? protagonistName.slice(0, 2).toUpperCase() : 'VIP'),
    milestoneTitle: (eventName || 'PRIVATE GALA').toUpperCase(),
    organizerEmail: organizerEmail,
    createdAt: new Date().toISOString()
  };

  events[cleanSlug] = newEventConfig;
  writeJsonFile('events.json', events);

  // Save auth record
  const admins = readJsonFile('admins.json', []);
  admins.push({
    email: organizerEmail,
    password: organizerPassword || 'admin123',
    role: 'admin',
    assignedSlugs: [cleanSlug],
    inviteToken: token,
    createdAt: new Date().toISOString()
  });
  writeJsonFile('admins.json', admins);

  res.json({
    success: true,
    slug: cleanSlug,
    inviteToken: token,
    magicLink: `${req.protocol}://${req.get('host')}/admin.html?invite=${token}&event=${cleanSlug}`,
    publicLink: `${req.protocol}://${req.get('host')}/index.html?event=${cleanSlug}`
  });
});

app.post('/api/events/:slug', (req, res) => {
  const slug = req.params.slug || 'master_default';
  const newConfig = req.body;
  newConfig.slug = slug;
  newConfig.updatedAt = new Date().toISOString();

  const events = readJsonFile('events.json', {});
  events[slug] = newConfig;
  writeJsonFile('events.json', events);

  res.json({ success: true, slug, message: `Event ${slug} successfully saved to server database.` });
});

app.delete('/api/events/:slug', (req, res) => {
  const slug = req.params.slug;
  if (!slug || slug === 'master_default') {
    return res.status(400).json({ success: false, message: 'Cannot delete master default template.' });
  }

  const events = readJsonFile('events.json', {});
  if (events[slug]) {
    delete events[slug];
    writeJsonFile('events.json', events);
  }

  const guests = readJsonFile('guests.json', {});
  if (guests[slug]) {
    delete guests[slug];
    writeJsonFile('guests.json', guests);
  }

  const cheers = readJsonFile('cheers.json', {});
  if (cheers[slug]) {
    delete cheers[slug];
    writeJsonFile('cheers.json', cheers);
  }

  const toasts = readJsonFile('toasts.json', {});
  if (toasts[slug]) {
    delete toasts[slug];
    writeJsonFile('toasts.json', toasts);
  }

  const admins = readJsonFile('admins.json', []);
  const filteredAdmins = admins.filter(a => !(a.assignedSlugs && a.assignedSlugs.includes(slug)));
  writeJsonFile('admins.json', filteredAdmins);

  res.json({ success: true, slug, message: `Event ${slug} permanently deleted from all server databases.` });
});

// ============================================================================
// 3. VIP RSVP GUESTS CONCIERGE API
// ============================================================================
app.get('/api/events/:slug/guests', (req, res) => {
  const slug = req.params.slug || 'master_default';
  const allGuests = readJsonFile('guests.json', {});
  const list = allGuests[slug] || [];
  res.json({ success: true, slug, count: list.length, guests: list });
});

app.post('/api/events/:slug/guests', async (req, res) => {
  const slug = req.params.slug || 'master_default';
  const guestData = req.body;

  if (!guestData.name || !guestData.email) {
    return res.status(400).json({ success: false, message: 'Guest name and email are required.' });
  }

  const allGuests = readJsonFile('guests.json', {});
  if (!allGuests[slug]) allGuests[slug] = [];

  const existingIdx = allGuests[slug].findIndex(
    g => (g.email || '').toLowerCase() === guestData.email.toLowerCase()
  );

  const mono = (guestData.monogramPrefix || 'VIP').slice(0, 3).toUpperCase();
  const passId = guestData.passId || `${mono}-${Math.floor(1000 + Math.random() * 9000)}-VIP`;

  guestData.passId = passId;
  guestData.updatedAt = new Date().toISOString();

  if (existingIdx >= 0) {
    allGuests[slug][existingIdx] = { ...allGuests[slug][existingIdx], ...guestData };
  } else {
    guestData.checkedIn = false;
    guestData.createdAt = new Date().toISOString();
    allGuests[slug].unshift(guestData);
  }

  writeJsonFile('guests.json', allGuests);

  res.json({ success: true, slug, passId, guest: guestData });
});

app.delete('/api/events/:slug/guests/:index', (req, res) => {
  const slug = req.params.slug || 'master_default';
  const idx = parseInt(req.params.index, 10);
  const allGuests = readJsonFile('guests.json', {});

  if (allGuests[slug] && idx >= 0 && idx < allGuests[slug].length) {
    const deleted = allGuests[slug].splice(idx, 1);
    writeJsonFile('guests.json', allGuests);
    return res.json({ success: true, deleted: deleted[0] });
  }
  res.status(404).json({ success: false, message: 'Guest not found' });
});

app.post('/api/events/:slug/guests/:index/checkin', (req, res) => {
  const slug = req.params.slug || 'master_default';
  const idx = parseInt(req.params.index, 10);
  const allGuests = readJsonFile('guests.json', {});

  if (allGuests[slug] && idx >= 0 && idx < allGuests[slug].length) {
    allGuests[slug][idx].checkedIn = !allGuests[slug][idx].checkedIn;
    writeJsonFile('guests.json', allGuests);
    return res.json({ success: true, checkedIn: allGuests[slug][idx].checkedIn });
  }
  res.status(404).json({ success: false, message: 'Guest not found' });
});

app.get('/api/events/:slug/guests/export', (req, res) => {
  const slug = req.params.slug || 'master_default';
  const allGuests = readJsonFile('guests.json', {});
  const list = allGuests[slug] || [];

  const headers = ["Pass ID", "Guest Name", "Email", "Attendance", "Plus-Ones", "Companion Name", "Dinner Choice", "Cocktail Choice", "Song Request", "Personal Note", "Door Check-in", "Registered At"];
  const rows = list.map(g => [
    `"${g.passId || ''}"`,
    `"${g.name || ''}"`,
    `"${g.email || ''}"`,
    `"${g.attendance || ''}"`,
    `"${g.plusOneCount || '0'}"`,
    `"${g.plusOneName || ''}"`,
    `"${g.dietary || ''}"`,
    `"${g.cocktail || ''}"`,
    `"${(g.song || '').replace(/"/g, '""')}"`,
    `"${(g.message || '').replace(/"/g, '""')}"`,
    `"${g.checkedIn ? 'CHECKED IN' : 'PENDING'}"`,
    `"${g.createdAt || ''}"`
  ]);

  const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="VIP_Guests_${slug}_${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csvContent);
});

app.get('/api/events/:slug/pass/:passId', (req, res) => {
  const { slug, passId } = req.params;
  const allGuests = readJsonFile('guests.json', {});
  const list = allGuests[slug] || [];
  const guest = list.find(g => (g.passId || '').toUpperCase() === passId.toUpperCase());

  if (guest) {
    const events = readJsonFile('events.json', {});
    const config = events[slug] || {};
    return res.json({ success: true, guest, config });
  }
  res.status(404).json({ success: false, message: 'VIP Pass not found.' });
});

// ============================================================================
// 4. TOAST WALL & CHEERS COUNTER API (CROSS-DEVICE SYNC)
// ============================================================================
app.get('/api/events/:slug/cheers', (req, res) => {
  const slug = req.params.slug || 'master_default';
  const allCheers = readJsonFile('cheers.json', {});
  const count = (typeof allCheers[slug] === 'number' && allCheers[slug] >= 249) ? allCheers[slug] : 249;
  res.json({ success: true, slug, count });
});

app.post('/api/events/:slug/cheers', (req, res) => {
  const slug = req.params.slug || 'master_default';
  const { count } = req.body;
  const allCheers = readJsonFile('cheers.json', {});
  let newCount = typeof count === 'number' ? count : (allCheers[slug] || 249) + 1;
  if (newCount < 249) newCount = 249;
  allCheers[slug] = newCount;
  writeJsonFile('cheers.json', allCheers);
  res.json({ success: true, slug, count: newCount });
});

app.get('/api/events/:slug/toasts', (req, res) => {
  const slug = req.params.slug || 'master_default';
  const allToasts = readJsonFile('toasts.json', {});
  const list = allToasts[slug] || [];
  res.json({ success: true, slug, count: list.length, toasts: list });
});

app.post('/api/events/:slug/toasts', (req, res) => {
  const slug = req.params.slug || 'master_default';
  const { author, message, time, signature } = req.body;
  if (!author || !message) {
    return res.status(400).json({ success: false, message: 'Author and message are required.' });
  }
  const allToasts = readJsonFile('toasts.json', {});
  if (!allToasts[slug]) allToasts[slug] = [];
  const toastItem = {
    id: 'toast_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    author: author.trim(),
    message: message.trim(),
    time: time || 'Just now',
    signature: signature || '✨ Sent with love',
    createdAt: new Date().toISOString()
  };
  allToasts[slug].unshift(toastItem);
  writeJsonFile('toasts.json', allToasts);
  res.json({ success: true, slug, toast: toastItem, toasts: allToasts[slug] });
});

// ============================================================================
// 4. TOAST WALL & CHAMPAGNE COUNTER API
// ============================================================================
app.get('/api/events/:slug/toasts', (req, res) => {
  const slug = req.params.slug || 'master_default';
  const allToasts = readJsonFile('toasts.json', {});
  const data = allToasts[slug] || { clinkCount: 384, list: [] };
  res.json({ success: true, slug, clinkCount: data.clinkCount, toasts: data.list });
});

app.post('/api/events/:slug/toasts', (req, res) => {
  const slug = req.params.slug || 'master_default';
  const { author, message } = req.body;
  if (!author || !message) {
    return res.status(400).json({ success: false, message: 'Author and message are required.' });
  }

  const allToasts = readJsonFile('toasts.json', {});
  if (!allToasts[slug]) allToasts[slug] = { clinkCount: 384, list: [] };

  const newToast = {
    id: Date.now().toString(),
    author: author.trim(),
    message: message.trim(),
    badge: 'Guest Toast',
    timestamp: new Date().toISOString()
  };

  allToasts[slug].list.unshift(newToast);
  allToasts[slug].clinkCount = (allToasts[slug].clinkCount || 0) + 1;
  writeJsonFile('toasts.json', allToasts);

  res.json({ success: true, toast: newToast, clinkCount: allToasts[slug].clinkCount });
});

app.post('/api/events/:slug/clink', (req, res) => {
  const slug = req.params.slug || 'master_default';
  const allToasts = readJsonFile('toasts.json', {});
  if (!allToasts[slug]) allToasts[slug] = { clinkCount: 384, list: [] };

  allToasts[slug].clinkCount = (allToasts[slug].clinkCount || 0) + 1;
  writeJsonFile('toasts.json', allToasts);

  res.json({ success: true, clinkCount: allToasts[slug].clinkCount });
});

// ============================================================================
// 5. MEDIA & AUDIO FILE UPLOAD API
// ============================================================================
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }

  const publicUrl = `/uploads/${req.file.filename}`;
  res.json({
    success: true,
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype,
    url: publicUrl
  });
});

// ============================================================================
// 6. AUTHENTICATION & ORGANIZER API
// ============================================================================
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password required' });
  }

  // Super admin check
  const superPass = process.env.SUPER_ADMIN_PASSWORD || 'superadmin123';
  if (email.toLowerCase() === 'admin@luxury.com' && password === superPass) {
    return res.json({
      success: true,
      user: { email: 'admin@luxury.com', role: 'superadmin', name: 'Super Administrator' }
    });
  }

  const admins = readJsonFile('admins.json', []);
  const found = admins.find(a => a.email.toLowerCase() === email.toLowerCase() && a.password === password);

  if (found) {
    return res.json({
      success: true,
      user: {
        email: found.email,
        role: found.role || 'admin',
        assignedSlugs: found.assignedSlugs || ['victoria-25'],
        name: found.name || 'Event Organizer'
      }
    });
  }

  res.status(401).json({ success: false, message: 'Invalid email or password.' });
});

app.post('/api/auth/verify-magic', (req, res) => {
  const { token, event } = req.body;
  const admins = readJsonFile('admins.json', []);
  const found = admins.find(a => a.inviteToken === token);

  if (found) {
    return res.json({
      success: true,
      email: found.email,
      eventSlug: (found.assignedSlugs && found.assignedSlugs[0]) || event || 'victoria-25'
    });
  }

  res.status(404).json({ success: false, message: 'Magic invite link is invalid or expired.' });
});

app.post('/api/auth/register-magic', (req, res) => {
  const { token, email, password } = req.body;
  const admins = readJsonFile('admins.json', []);
  const foundIdx = admins.findIndex(a => a.inviteToken === token || (a.email && a.email.toLowerCase() === email.toLowerCase()));

  if (foundIdx >= 0) {
    admins[foundIdx].password = password;
    admins[foundIdx].registered = true;
    writeJsonFile('admins.json', admins);
    return res.json({ success: true, message: 'Account activated successfully!' });
  }

  res.status(400).json({ success: false, message: 'Could not activate account.' });
});

app.post('/api/auth/send-verification-code', (req, res) => {
  const { email } = req.body;
  const code = Math.floor(10000 + Math.random() * 90000).toString();

  // Store code temporarily
  const codes = readJsonFile('temp_codes.json', {});
  codes[email.toLowerCase()] = { code, expiresAt: Date.now() + 15 * 60 * 1000 };
  writeJsonFile('temp_codes.json', codes);

  console.log(`🔑 Verification code for ${email}: ${code}`);
  res.json({ success: true, message: `5-Digit Code generated.`, code: code });
});

// ============================================================================
// 7. LUXURY EMAIL DISPATCH SERVICE (NODEMAILER)
// ============================================================================
app.post('/api/dispatch-invite', async (req, res) => {
  const { name, email, eventSlug, eventTitle, eventDate, venueName, plusOne, directLink } = req.body;

  if (!email || !name) {
    return res.status(400).json({ success: false, message: 'Guest name and email are required.' });
  }

  const events = readJsonFile('events.json', {});
  const config = events[eventSlug || 'master_default'] || {};

  const celebrant = config.protagonistName || 'Victoria Sterling';
  const monogram = config.protagonistMonogram || 'VS';
  const galaTitle = eventTitle || config.milestoneTitle || config.eventName || `${celebrant}'s VIP Gala`;
  const galaDate = eventDate || config.eventDateText || config.vipPassDate || "Saturday, October 17, 2026";
  const galaTime = config.receptionTime || config.vipPassTime || "19:00 Till Late";
  const galaVenue = venueName || config.venueName || "Hôtel de Crillon Penthouse, Paris";
  const inviteUrl = directLink || `${req.protocol}://${req.get('host')}/index.html?event=${eventSlug || 'victoria-25'}&guest=${encodeURIComponent(name)}&plus=${plusOne ? '1' : '0'}`;

  const emailSubject = `✨ ${galaTitle}`;

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${emailSubject}</title>
  </head>
  <body style="margin:0; padding:0; background-color: #07070b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #FFFFFF;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #07070b; padding: 30px 10px;">
      <tr>
        <td align="center">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 540px; background: linear-gradient(135deg, #14141e 0%, #0a0a0f 100%); border: 1.5px solid #D4AF37; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.9), 0 0 35px rgba(212,175,55,0.3); overflow: hidden;">
            
            <!-- VIP Pass Top Header -->
            <tr>
              <td style="padding: 24px 28px 16px; border-bottom: 1px solid rgba(212, 175, 55, 0.25);">
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td align="left">
                      <table border="0" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="width: 38px; height: 38px; border: 1.5px solid #FFDF73; border-radius: 50%; text-align: center; color: #FFDF73; font-size: 14px; font-weight: bold; letter-spacing: 1px; vertical-align: middle;">
                            ${monogram}
                          </td>
                          <td style="padding-left: 10px; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; color: #FFDF73;">
                            VIP • ALL ACCESS
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td align="right" style="font-size: 11px; font-weight: bold; letter-spacing: 1px; color: #FFDF73;">
                      ✦ HAUTE GALA
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- VIP Pass Center Body -->
            <tr>
              <td align="center" style="padding: 30px 24px 20px;">
                <div style="font-size: 11px; letter-spacing: 3px; color: #D4AF37; text-transform: uppercase; font-weight: 600; margin-bottom: 8px;">
                  CORDIALLY INVITES
                </div>
                <div style="font-size: 28px; font-weight: bold; color: #FFFFFF; font-family: Georgia, 'Times New Roman', serif; margin-bottom: 8px;">
                  ${name}
                </div>
                <div style="font-size: 11px; letter-spacing: 2px; color: #A6A49F; text-transform: uppercase; margin-bottom: 4px;">
                  TO CELEBRATE THE MILESTONE OF
                </div>
                <div style="font-size: 32px; font-family: Georgia, 'Times New Roman', serif; font-style: italic; color: #FFDF73; font-weight: bold; margin-bottom: 24px;">
                  ${celebrant}
                </div>

                <!-- Event Details Grid -->
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background: rgba(0,0,0,0.5); border: 1px solid rgba(212, 175, 55, 0.3); border-radius: 12px; margin-bottom: 26px;">
                  <tr>
                    <td width="33%" align="center" style="padding: 14px 6px; border-right: 1px solid rgba(212, 175, 55, 0.2);">
                      <div style="font-size: 10px; color: #888; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px;">DATE</div>
                      <div style="font-size: 12px; font-weight: bold; color: #FFF;">${galaDate}</div>
                    </td>
                    <td width="33%" align="center" style="padding: 14px 6px; border-right: 1px solid rgba(212, 175, 55, 0.2);">
                      <div style="font-size: 10px; color: #888; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px;">TIME</div>
                      <div style="font-size: 12px; font-weight: bold; color: #FFF;">${galaTime}</div>
                    </td>
                    <td width="33%" align="center" style="padding: 14px 6px;">
                      <div style="font-size: 10px; color: #888; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px;">VENUE</div>
                      <div style="font-size: 12px; font-weight: bold; color: #FFF;">${galaVenue}</div>
                    </td>
                  </tr>
                </table>

                <!-- Action Button -->
                <table border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 18px;">
                  <tr>
                    <td align="center" style="border-radius: 30px; background: linear-gradient(135deg, #FFDF73 0%, #D4AF37 50%, #9B7B3E 100%);">
                      <a href="${inviteUrl}" target="_blank" style="display: inline-block; padding: 14px 36px; font-size: 13px; font-weight: bold; letter-spacing: 1.5px; text-transform: uppercase; color: #07070b; text-decoration: none; border-radius: 30px;">
                        Open VIP Invitation & Pass →
                      </a>
                    </td>
                  </tr>
                </table>

                <div style="font-size: 10px; font-family: monospace; letter-spacing: 3px; color: #FFDF73; opacity: 0.75;">
                  #${monogram}-${Math.floor(1000 + Math.random() * 9000)}-VIP
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td align="center" style="padding: 16px; border-top: 1px solid rgba(212, 175, 55, 0.15); font-size: 10px; color: #666;">
                © 2026 ${celebrant}. Private VIP Milestone Invitation.
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  // 1. Direct Resend API Dispatch (Zero-config 100% cloud email)
  if (process.env.RESEND_API_KEY) {
    try {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: process.env.SMTP_FROM || `${celebrant} <onboarding@resend.dev>`,
          to: [email],
          subject: emailSubject,
          html: htmlContent
        })
      });
      const resendData = await resendRes.json();
      if (resendRes.ok) {
        console.log(`✉️ Email successfully delivered to ${email} via Resend (ID: ${resendData.id})`);
        return res.json({
          success: true,
          messageId: resendData.id,
          previewUrl: inviteUrl,
          message: `Personalized VIP invitation successfully delivered to ${email}!`
        });
      } else {
        console.warn('Resend API error:', resendData);
      }
    } catch (e) {
      console.warn('Resend dispatch exception:', e.message);
    }
  }

  // 2. Standard SMTP Transporter (Brevo / Gmail / Mailjet / etc.)
  try {
    const transporter = await getMailTransporter();
    if (!transporter) {
      return res.json({
        success: true,
        simulated: true,
        previewUrl: inviteUrl,
        message: `Email invite prepared for ${email} (Simulated).`
      });
    }

    const mailOptions = {
      from: `"${celebrant}" <${process.env.SMTP_FROM || 'concierge@luxury.com'}>`,
      to: `"${name}" <${email}>`,
      subject: emailSubject,
      html: htmlContent
    };

    const info = await transporter.sendMail(mailOptions);
    const etherealUrl = nodemailer.getTestMessageUrl(info);

    res.json({
      success: true,
      messageId: info.messageId,
      previewUrl: etherealUrl || inviteUrl,
      message: `Personalized VIP invitation successfully sent to ${email}!`
    });
  } catch (err) {
    console.warn('SMTP Socket warning, returning direct preview link:', err.message);
    res.json({
      success: true,
      simulated: true,
      previewUrl: inviteUrl,
      message: `Personalized VIP invitation generated for ${name} (${email})!`
    });
  }
});

// ============================================================================
// 8. CATCH-ALL ROUTE (SPA FALLBACK)
// ============================================================================
app.get('*', (req, res) => {
  if (req.path.startsWith('/admin')) {
    return res.sendFile(path.join(ROOT_DIR, 'admin.html'));
  }
  res.sendFile(path.join(ROOT_DIR, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`
  👑 ==========================================================
  ✨ DESIGN STUDIO • LUXURY PLATFORM RUNNING
  🌐 Local URL:       http://localhost:${PORT}
  👑 Admin Studio:    http://localhost:${PORT}/admin.html
  📁 Media Uploads:   ${UPLOADS_DIR}
  💾 Database:        ${DATA_DIR}
  ==========================================================
  `);
});

module.exports = app;
