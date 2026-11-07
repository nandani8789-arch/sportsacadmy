require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} = require('@simplewebauthn/server');

const app = express();
const PORT = process.env.PORT || 5000;
const RP_ID = process.env.RP_ID || 'localhost';
const RP_NAME = process.env.RP_NAME || 'TruPlay Academy';
const CLIENT_URL = process.env.CLIENT_URL || `http://localhost:${PORT}`;
const ALLOWED_ORIGINS = [
  CLIENT_URL,
  `http://localhost:${PORT}`,
  `http://127.0.0.1:${PORT}`,
  'http://localhost:5173',
  'http://127.0.0.1:5173'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin) || origin.startsWith('http://localhost:')) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json());

let dbReady = false;
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  passwordHash: String,
  role: { type: String, default: 'Player' },
  credentials: [{
    id: String,
    publicKey: Buffer,
    counter: Number,
    transports: [String],
    deviceType: String,
    backedUp: Boolean
  }]
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
const SessionSchema = new mongoose.Schema({
  date: String,
  sport: String,
  coachId: mongoose.Schema.Types.ObjectId,
  marks: [{ playerId: mongoose.Schema.Types.ObjectId, status: String }],
  closed: Boolean
});
const MatchSchema = new mongoose.Schema({
  date: String,
  sport: String,
  opponent: String,
  score: String,
  result: String,
  academyId: mongoose.Schema.Types.ObjectId
});
const PlayerSchema = new mongoose.Schema({
  name: String,
  sport: String,
  attendance: Number,
  matches: Number,
  academyId: mongoose.Schema.Types.ObjectId
});

const Session = mongoose.model('Session', SessionSchema);
const Match = mongoose.model('Match', MatchSchema);
const Player = mongoose.model('Player', PlayerSchema);

if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
      dbReady = true;
      console.log('MongoDB connected');
    })
    .catch(e => console.error('MongoDB connection failed:', e.message));
}

const tokenFor = u => jwt.sign(
  { id: u._id, email: u.email, role: u.role },
  process.env.JWT_SECRET || 'development_only_change_me',
  { expiresIn: '7d' }
);
const safeUser = u => ({ id: u._id, name: u.name, email: u.email, role: u.role });

function auth(req, res, next) {
  const t = (req.headers.authorization || '').replace('Bearer ', '');
  try {
    req.user = jwt.verify(t, process.env.JWT_SECRET || 'development_only_change_me');
    next();
  } catch {
    return res.status(401).json({ message: 'Please log in again.' });
  }
}

// API Routes
app.get('/api/health', (req, res) => res.json({ ok: true, database: dbReady ? 'connected' : 'not connected' }));

app.post('/api/auth/signup', async (req, res) => {
  try {
    if (!dbReady) return res.status(503).json({ message: 'Database is not connected. Add MONGODB_URI in .env.' });
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || password.length < 6) {
      return res.status(400).json({ message: 'Enter your name, email and a password of at least 6 characters.' });
    }
    if (await User.findOne({ email })) return res.status(409).json({ message: 'An account with this email already exists.' });
    const u = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12), role });
    res.json({ token: tokenFor(u), user: safeUser(u) });
  } catch (e) {
    res.status(500).json({ message: 'Could not create account.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    if (!dbReady) return res.status(503).json({ message: 'Database is not connected.' });
    const u = await User.findOne({ email: req.body.email });
    if (!u || !(await bcrypt.compare(req.body.password || '', u.passwordHash))) {
      return res.status(401).json({ message: 'Email or password is incorrect.' });
    }
    res.json({ token: tokenFor(u), user: safeUser(u) });
  } catch (e) {
    res.status(500).json({ message: 'Could not log in.' });
  }
});

app.get('/api/players', auth, async (req, res) => res.json(await Player.find({})));
app.post('/api/players', auth, async (req, res) => {
  const p = await Player.create({ ...req.body, attendance: 0, matches: 0 });
  res.status(201).json(p);
});

app.get('/api/sessions', auth, async (req, res) => res.json(await Session.find({}).sort({ createdAt: -1 })));
app.post('/api/sessions', auth, async (req, res) => {
  res.status(201).json(await Session.create({ ...req.body, coachId: req.user.id, closed: false }));
});
app.patch('/api/sessions/:id/close', auth, async (req, res) => {
  const s = await Session.findByIdAndUpdate(req.params.id, { closed: true, marks: req.body.marks }, { new: true });
  if (!s) return res.status(404).json({ message: 'Session not found' });
  res.json(s);
});

app.get('/api/matches', auth, async (req, res) => res.json(await Match.find({}).sort({ date: 1 })));
app.post('/api/matches', auth, async (req, res) => res.status(201).json(await Match.create(req.body)));

const challenges = new Map();

app.post('/api/webauthn/register/options', auth, async (req, res) => {
  try {
    const u = await User.findById(req.user.id);
    const opts = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userName: u.email,
      userDisplayName: u.name,
      userID: new Uint8Array(Buffer.from(String(u._id))),
      attestationType: 'none',
      authenticatorSelection: { residentKey: 'preferred', userVerification: 'required' },
      excludeCredentials: u.credentials.map(c => ({ id: c.id, transports: c.transports }))
    });
    challenges.set(String(u._id), opts.challenge);
    res.json(opts);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.post('/api/webauthn/register/verify', auth, async (req, res) => {
  try {
    const u = await User.findById(req.user.id);
    const expectedChallenge = challenges.get(String(u._id));
    const requestOrigin = req.headers.origin || CLIENT_URL;
    const verification = await verifyRegistrationResponse({
      response: req.body.credential,
      expectedChallenge,
      expectedOrigin: ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : ALLOWED_ORIGINS,
      expectedRPID: RP_ID,
      requireUserVerification: true
    });
    if (verification.verified) {
      const info = verification.registrationInfo;
      const cred = info.credential || info;
      u.credentials.push({
        id: cred.id || cred.credentialID,
        publicKey: Buffer.from(cred.publicKey || info.credentialPublicKey),
        counter: cred.counter ?? info.counter ?? 0,
        transports: req.body.credential.response.transports || [],
        deviceType: info.credentialDeviceType,
        backedUp: info.credentialBackedUp
      });
      await u.save();
    }
    challenges.delete(String(u._id));
    res.json({ verified: verification.verified });
  } catch (e) {
    res.status(400).json({ verified: false, message: e.message });
  }
});

app.post('/api/webauthn/authenticate/options', async (req, res) => {
  try {
    if (!dbReady) return res.json({ demo: true });
    const u = await User.findOne({ email: req.body.email });
    if (!u || !u.credentials.length) {
      return res.status(404).json({ message: 'No passkey registered for this account. Sign in with password and register one in Settings.' });
    }
    const opts = await generateAuthenticationOptions({
      rpID: RP_ID,
      allowCredentials: u.credentials.map(c => ({ id: c.id, transports: c.transports })),
      userVerification: 'required'
    });
    challenges.set(String(u._id), opts.challenge);
    res.json(opts);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.post('/api/webauthn/authenticate/verify', async (req, res) => {
  try {
    const u = await User.findOne({ email: req.body.email });
    if (!u) return res.status(404).json({ message: 'Account not found.' });
    const cred = u.credentials.find(c => c.id === req.body.assertion.id);
    if (!cred) return res.status(400).json({ message: 'Passkey not recognized.' });
    const requestOrigin = req.headers.origin || CLIENT_URL;
    const verification = await verifyAuthenticationResponse({
      response: req.body.assertion,
      expectedChallenge: challenges.get(String(u._id)),
      expectedOrigin: ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : ALLOWED_ORIGINS,
      expectedRPID: RP_ID,
      credential: {
        id: cred.id,
        publicKey: new Uint8Array(cred.publicKey),
        counter: cred.counter,
        transports: cred.transports
      },
      requireUserVerification: true
    });
    if (verification.verified) {
      cred.counter = verification.authenticationInfo.newCounter;
      await u.save();
      res.json({ verified: true, token: tokenFor(u), user: safeUser(u) });
    } else {
      res.status(401).json({ verified: false, message: 'Biometric verification failed.' });
    }
    challenges.delete(String(u._id));
  } catch (e) {
    res.status(400).json({ verified: false, message: e.message });
  }
});

// Serve frontend static build assets (only in non-serverless env)
const distDir = path.join(__dirname, '../dist');
if (!process.env.VERCEL) {
  app.use(express.static(distDir));
  // Fallback to index.html for React Router SPA routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// Export for Vercel serverless
module.exports = app;

// Start local server when NOT on Vercel
if (!process.env.VERCEL) {
  function startServer(portToTry) {
    const server = app.listen(portToTry, () => {
      console.log(`\n==================================================`);
      console.log(`🚀 TruPlay Academy is running live at:`);
      console.log(`👉 http://localhost:${portToTry}`);
      console.log(`==================================================\n`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        const fallbackPort = Number(portToTry) + 1;
        console.warn(`Port ${portToTry} is in use, attempting port ${fallbackPort}...`);
        startServer(fallbackPort);
      } else {
        console.error('Server error:', err);
      }
    });
  }

  startServer(PORT);
}
