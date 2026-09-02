/**
 * User Management Routes — Admin only.
 * Full CRUD for user accounts with audit logging for every action.
 */
const express = require('express');
const argon2 = require('argon2');
const { nanoid } = require('nanoid');
const { User } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');
const { appendAuditLog } = require('../services/audit');

const router = express.Router();

// All routes in this file require admin role
router.use(requireAuth, requireRole('administrator'));

// GET /api/users — List all users
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.is_active !== undefined) filter.is_active = req.query.is_active === 'true';
    if (req.query.q) {
      const q = req.query.q.trim();
      filter['$or'] = [
        { username: { $regex: q, $options: 'i' } },
        { full_name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { user_id: { $regex: q, $options: 'i' } },
      ];
    }

    const users = await User.find(filter)
      .select('-password_hash')
      .sort({ created_at: -1 })
      .lean();

    res.json({ users, total: users.length });
  } catch (err) {
    console.error('[USERS] List error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/users/:id — Get single user
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findOne({ user_id: req.params.id }).select('-password_hash').lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('[USERS] Get error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST /api/users — Create new user
router.post('/', async (req, res) => {
  try {
    const { username, password, role, full_name, email } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const validRoles = ['administrator', 'registration_officer', 'auditor', 'customer'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    // Check existing
    const existing = await User.findOne({ username: username.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    if (email) {
      const emailExists = await User.findOne({ email: email.toLowerCase().trim() });
      if (emailExists) {
        return res.status(409).json({ error: 'Email already in use' });
      }
    }

    // Password strength (basic)
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const hash = await argon2.hash(password, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 });

    const newUser = new User({
      user_id: `USR-${nanoid(8)}`,
      username: username.toLowerCase().trim(),
      password_hash: hash,
      role: role || 'customer',
      full_name: full_name || '',
      email: email?.toLowerCase().trim() || undefined,
    });

    await newUser.save();

    await appendAuditLog({
      user_id: req.session.user_id,
      role: req.session.role,
      action: 'USER_CREATED',
      details: {
        created_user_id: newUser.user_id,
        created_username: newUser.username,
        created_role: newUser.role,
      },
      req,
    });

    res.status(201).json({
      message: 'User created successfully',
      user: {
        user_id: newUser.user_id,
        username: newUser.username,
        role: newUser.role,
        full_name: newUser.full_name,
        email: newUser.email,
        is_active: newUser.is_active,
        created_at: newUser.created_at,
      },
    });
  } catch (err) {
    console.error('[USERS] Create error:', err);
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PUT /api/users/:id — Update user info
router.put('/:id', async (req, res) => {
  try {
    const user = await User.findOne({ user_id: req.params.id });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { full_name, email, password } = req.body;

    const changes = {};
    if (full_name !== undefined) { changes.full_name = full_name; user.full_name = full_name; }
    if (email !== undefined) {
      if (email) {
        const emailExists = await User.findOne({ email: email.toLowerCase().trim(), user_id: { $ne: req.params.id } });
        if (emailExists) return res.status(409).json({ error: 'Email already in use' });
        user.email = email.toLowerCase().trim();
      } else {
        user.email = undefined;
      }
      changes.email = email;
    }
    if (password) {
      if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
      user.password_hash = await argon2.hash(password, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 });
      changes.password_changed = true;
    }

    await user.save();

    await appendAuditLog({
      user_id: req.session.user_id,
      role: req.session.role,
      action: 'USER_UPDATED',
      details: { target_user_id: user.user_id, target_username: user.username, changes },
      req,
    });

    res.json({
      message: 'User updated successfully',
      user: {
        user_id: user.user_id,
        username: user.username,
        role: user.role,
        full_name: user.full_name,
        email: user.email,
        is_active: user.is_active,
      },
    });
  } catch (err) {
    console.error('[USERS] Update error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// PUT /api/users/:id/role — Change user role
router.put('/:id/role', async (req, res) => {
  try {
    const user = await User.findOne({ user_id: req.params.id });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { role } = req.body;
    const validRoles = ['administrator', 'registration_officer', 'auditor', 'customer'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    // Prevent admin from demoting themselves
    if (user.user_id === req.session.user_id) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    const previousRole = user.role;
    user.role = role;
    await user.save();

    await appendAuditLog({
      user_id: req.session.user_id,
      role: req.session.role,
      action: 'ROLE_CHANGED',
      details: {
        target_user_id: user.user_id,
        target_username: user.username,
        previous_role: previousRole,
        new_role: role,
      },
      req,
    });

    res.json({
      message: `Role changed from ${previousRole} to ${role}`,
      user: {
        user_id: user.user_id,
        username: user.username,
        role: user.role,
        full_name: user.full_name,
      },
    });
  } catch (err) {
    console.error('[USERS] Role change error:', err);
    res.status(500).json({ error: 'Failed to change role' });
  }
});

// PUT /api/users/:id/status — Activate/deactivate user
router.put('/:id/status', async (req, res) => {
  try {
    const user = await User.findOne({ user_id: req.params.id });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Prevent admin from deactivating themselves
    if (user.user_id === req.session.user_id) {
      return res.status(400).json({ error: 'Cannot change your own account status' });
    }

    const { is_active } = req.body;
    if (is_active === undefined) return res.status(400).json({ error: 'is_active field required' });

    const previousStatus = user.is_active;
    user.is_active = is_active;
    await user.save();

    const action = is_active ? 'USER_ACTIVATED' : 'USER_DEACTIVATED';

    await appendAuditLog({
      user_id: req.session.user_id,
      role: req.session.role,
      action,
      details: {
        target_user_id: user.user_id,
        target_username: user.username,
        previous_status: previousStatus,
        new_status: is_active,
      },
      req,
    });

    res.json({
      message: `User ${is_active ? 'activated' : 'deactivated'} successfully`,
      user: {
        user_id: user.user_id,
        username: user.username,
        is_active: user.is_active,
      },
    });
  } catch (err) {
    console.error('[USERS] Status change error:', err);
    res.status(500).json({ error: 'Failed to change user status' });
  }
});

// DELETE /api/users/:id — Remove user (with safeguards)
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findOne({ user_id: req.params.id });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Prevent admin from deleting themselves
    if (user.user_id === req.session.user_id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Don't allow deletion of the last admin
    if (user.role === 'administrator') {
      const adminCount = await User.countDocuments({ role: 'administrator', is_active: true });
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last active administrator' });
      }
    }

    await User.deleteOne({ user_id: req.params.id });

    await appendAuditLog({
      user_id: req.session.user_id,
      role: req.session.role,
      action: 'USER_DELETED',
      details: {
        deleted_user_id: user.user_id,
        deleted_username: user.username,
        deleted_role: user.role,
      },
      req,
    });

    res.json({ message: 'User removed successfully', user_id: user.user_id });
  } catch (err) {
    console.error('[USERS] Delete error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
