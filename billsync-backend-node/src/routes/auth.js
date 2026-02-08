import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import crypto from 'crypto';

const router = express.Router();

function verifyWerkzeugPBKDF2(stored, password) {
  // Expected format: pbkdf2:sha256:iterations$salt$hashhex
  try {
    if (!stored.startsWith('pbkdf2:sha256:')) return false;
    const [methodPart, rest] = stored.split(':sha256:');
    const [iterationsAndSalt, hashHex] = rest.split('$').slice(0).reduce((acc, val) => {
      if (acc.length === 0) return [[val], null];
      if (acc.length === 1) return [[...acc[0]], val];
      return acc;
    }, []);
    // iterationsAndSalt is like "260000$salt"
    const [iterStr, salt] = iterationsAndSalt.split('$');
    const iterations = parseInt(iterStr, 10) || 260000;
    const derived = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(derived, 'utf8'), Buffer.from(hashHex, 'utf8'));
  } catch (e) {
    return false;
  }
}

async function verifyPassword(user, password) {
  const h = user.passwordHash || '';
  if (h.startsWith('pbkdf2:sha256:')) {
    return verifyWerkzeugPBKDF2(h, password || '');
  }
  return bcrypt.compare(password || '', h);
}

router.post('/register', async (req, res) => {
  try {
    const { email, password, role = 'user' } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ error: 'Email already registered' });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email: email.toLowerCase(), passwordHash, role });
    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET || 'change-me', { expiresIn: '7d' });
    return res.json({ access_token: token, user });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const user = await User.findOne({ email: (email || '').toLowerCase() });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await verifyPassword(user, password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET || 'change-me', { expiresIn: '7d' });
    return res.json({ access_token: token, user });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.get('/me', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing token' });
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'change-me');
    const user = await User.findById(payload.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user });
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

router.post('/change-password', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing token' });
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'change-me');
    const user = await User.findById(payload.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { current_password, new_password } = req.body || {};
    const ok = await bcrypt.compare(current_password || '', user.passwordHash);
    if (!ok) return res.status(400).json({ error: 'Current password is incorrect' });
    if ((new_password || '').length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });
    user.passwordHash = await bcrypt.hash(new_password, 10);
    await user.save();
    return res.json({ message: 'Password changed successfully' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
