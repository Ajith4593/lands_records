const express = require('express');
const argon2 = require('argon2');
const rateLimit = require('express-rate-limit');
const { nanoid } = require('nanoid');
const { User } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { appendAuditLog } = require('../services/audit');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts. Try again in a minute.' }
});

const registerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  message: { error: 'Too many registration attempts. Try again in a minute.' }
});

// POST /api/auth/register — Real-time user self-registration (default role: customer)
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { username, password, full_name, email, role } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const cleanUsername = username.toLowerCase().trim();
    const cleanEmail = email ? email.toLowerCase().trim() : undefined;

    // Check duplicate
    const existing = await User.findOne({ username: cleanUsername });
    if (existing) {
      return res.status(409).json({ error: 'Username already registered' });
    }

    if (cleanEmail) {
      const emailExists = await User.findOne({ email: cleanEmail });
      if (emailExists) {
        return res.status(409).json({ error: 'Email already registered' });
      }
    }

    // By default self-registration is customer role unless specified and validated
    const assignedRole = (role && ['customer', 'registration_officer', 'auditor'].includes(role))
      ? role
      : 'customer';

    const hash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1
    });

    const user = new User({
      user_id: `USR-${nanoid(8)}`,
      username: cleanUsername,
      password_hash: hash,
      role: assignedRole,
      full_name: full_name?.trim() || cleanUsername,
      email: cleanEmail,
      is_active: true,
      last_login: new Date(),
    });

    await user.save();

    // Establish real-time session immediately upon registration
    req.session.user_id = user.user_id;
    req.session.role = user.role;
    req.session.username = user.username;
    req.session.full_name = user.full_name;

    await appendAuditLog({
      user_id: user.user_id,
      role: user.role,
      action: 'USER_REGISTERED',
      details: { username: user.username, role: user.role },
      req
    });

    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ error: 'Account created but session failed to start. Please log in.' });
      }
      res.status(201).json({
        message: 'Registration successful',
        user: {
          user_id: user.user_id,
          username: user.username,
          role: user.role,
          full_name: user.full_name,
          email: user.email,
        }
      });
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed: ' + (err.message || 'Internal server error') });
  }
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const user = await User.findOne({ username: username.toLowerCase().trim(), is_active: true });
    if (!user) return res.status(401).json({ error: 'Invalid credentials or inactive account' });

    const valid = await argon2.verify(user.password_hash, password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    // Create server-side session
    req.session.user_id = user.user_id;
    req.session.role = user.role;
    req.session.username = user.username;
    req.session.full_name = user.full_name;

    user.last_login = new Date();
    await user.save();

    await appendAuditLog({ user_id: user.user_id, role: user.role, action: 'USER_LOGIN', req });

    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ error: 'Failed to persist session' });
      }
      res.json({
        message: 'Login successful',
        user: { user_id: user.user_id, username: user.username, role: user.role, full_name: user.full_name }
      });
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// POST /api/auth/logout
router.post('/logout', requireAuth, async (req, res) => {
  const { user_id, role } = req.session;
  await appendAuditLog({ user_id, role, action: 'USER_LOGOUT', req });
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out' });
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({
    user_id: req.session.user_id,
    username: req.session.username,
    role: req.session.role,
    full_name: req.session.full_name,
  });
});

module.exports = router;
