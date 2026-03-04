const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');
const mailer = require('../mailer');

const router = express.Router();

const otpStore = new Map();

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function storeOTP(email, otp, type, name = null) {
  otpStore.set(email.toLowerCase(), {
    otp,
    type,
    name,
    expires: Date.now() + 10 * 60 * 1000
  });
}

function verifyOTP(email, otp, type) {
  const entry = otpStore.get(email.toLowerCase());

  if (!entry) {
    return { valid: false, error: 'No OTP found. Please request a new one.' };
  }

  if (entry.type !== type) {
    return { valid: false, error: 'Invalid OTP type.' };
  }

  if (Date.now() > entry.expires) {
    otpStore.delete(email.toLowerCase());
    return { valid: false, error: 'OTP has expired. Please request a new one.' };
  }

  if (entry.otp !== otp) {
    return { valid: false, error: 'Incorrect OTP. Please try again.' };
  }

  return { valid: true, entry };
}

router.post('/register/send-otp', async (req, res) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  const emailLower = email.toLowerCase().trim();

  try {
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [emailLower]
    );

    if (existing.length) {
      return res.status(409).json({
        error: 'An account with this email already exists. Please sign in.'
      });
    }

    const otp = generateOTP();

    storeOTP(emailLower, otp, 'register', name.trim());

    await mailer.sendOTP(emailLower, otp, name.trim());

    res.json({
      success: true,
      message: `Verification code sent to ${emailLower}`
    });

  } catch (err) {
    console.error('Send OTP error:', err);
    console.error('Send OTP error:', err.message, err.code, err.response);
  }
});

router.post('/register/verify-otp', (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required' });
  }

  const result = verifyOTP(email, otp, 'register');

  if (!result.valid) {
    return res.status(400).json({ error: result.error });
  }

  const entry = otpStore.get(email.toLowerCase());
  entry.verified = true;

  res.json({ success: true, name: entry.name });
});

router.post('/register/set-password', async (req, res) => {
  const { email, otp, password, confirmPassword } = req.body;

  if (!email || !otp || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const emailLower = email.toLowerCase().trim();
  const entry = otpStore.get(emailLower);

  if (!entry || !entry.verified || entry.type !== 'register') {
    return res.status(400).json({ error: 'Email not verified. Please start again.' });
  }

  if (Date.now() > entry.expires) {
    return res.status(400).json({ error: 'Session expired. Please start again.' });
  }

  try {
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [emailLower]
    );

    if (existing.length) {
      return res.status(409).json({
        error: 'Account already exists. Please sign in.'
      });
    }

    const hash = await bcrypt.hash(password, 10);

    const avatarLetter = entry.name[0].toUpperCase();

    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash, avatar_letter) VALUES (?, ?, ?, ?)',
      [entry.name, emailLower, hash, avatarLetter]
    );

    otpStore.delete(emailLower);

    const user = {
      id: result.insertId,
      name: entry.name,
      email: emailLower,
      avatar_letter: avatarLetter
    };

    req.session.userId = user.id;

    res.json({ success: true, user });

  } catch (err) {
    console.error('Set password error:', err);
    res.status(500).json({
      error: 'Account creation failed. Please try again.'
    });
  }
});

router.post('/admin-login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (!rows.length) {
      return res.status(401).json({
        error: 'No account found with this email'
      });
    }

    const user = rows[0];

    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({
        error: 'Access denied. This account does not have admin privileges.'
      });
    }

    if (user.is_banned) {
      return res.status(403).json({
        error: 'Your account has been suspended.'
      });
    }

    req.session.userId = user.id;
    req.session.role = user.role;

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar_letter: user.avatar_letter,
        role: user.role
      }
    });

  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({
      error: 'Login failed. Please try again.'
    });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: 'Email and password are required'
    });
  }

  try {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (!rows.length) {
      return res.status(401).json({
        error: 'No account found with this email'
      });
    }

    const user = rows[0];

    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    if (user.is_banned) {
      return res.status(403).json({
        error: 'Your account has been suspended. Please contact support.'
      });
    }

    if (user.role === 'admin') {
      return res.status(403).json({
        error: 'Admin accounts must use the Admin tab to sign in.'
      });
    }

    req.session.userId = user.id;
    req.session.role = user.role;

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar_letter: user.avatar_letter,
        role: user.role
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      error: 'Login failed. Please try again.'
    });
  }
});

router.get('/me', async (req, res) => {
  if (!req.session.userId) {
    return res.json({ user: null });
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, avatar_letter, role, created_at FROM users WHERE id = ?',
      [req.session.userId]
    );

    if (!rows.length) {
      return res.json({ user: null });
    }

    res.json({ user: rows[0] });

  } catch {
    res.json({ user: null });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

router.put('/profile', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { name, currentPassword, newPassword } = req.body;

  try {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE id = ?',
      [req.session.userId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = rows[0];
    const updates = {};

    if (name && name.trim()) {
      updates.name = name.trim();
      updates.avatar_letter = name.trim()[0].toUpperCase();
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          error: 'Current password required'
        });
      }

      const valid = await bcrypt.compare(
        currentPassword,
        user.password_hash
      );

      if (!valid) {
        return res.status(401).json({
          error: 'Current password is incorrect'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          error: 'New password must be at least 6 characters'
        });
      }

      updates.password_hash = await bcrypt.hash(newPassword, 10);
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    const setClauses = Object.keys(updates)
      .map(k => `${k} = ?`)
      .join(', ');

    await pool.query(
      `UPDATE users SET ${setClauses} WHERE id = ?`,
      [...Object.values(updates), req.session.userId]
    );

    const [updated] = await pool.query(
      'SELECT id, name, email, avatar_letter FROM users WHERE id = ?',
      [req.session.userId]
    );

    res.json({
      success: true,
      user: updated[0]
    });

  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Update failed' });
  }
});

module.exports = router;