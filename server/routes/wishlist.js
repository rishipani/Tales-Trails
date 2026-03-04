const express = require('express');
const pool = require('../db/pool');

const router = express.Router();

const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Please sign in' });
  }
  next();
};

router.get('/', requireAuth, async (req, res) => {
  try {
    const [items] = await pool.query(
      `SELECT w.id, w.book_id, w.added_at,
      b.title, b.author, b.price, b.original_price, b.cover_url, b.rating, b.category
      FROM wishlist w
      JOIN books b ON w.book_id = b.id
      WHERE w.user_id = ?
      ORDER BY w.added_at DESC`,
      [req.session.userId]
    );

    res.json({ items });

  } catch {
    res.status(500).json({ error: 'Failed to load wishlist' });
  }
});

router.post('/:bookId', requireAuth, async (req, res) => {
  try {
    const [existing] = await pool.query(
      'SELECT id FROM wishlist WHERE user_id = ? AND book_id = ?',
      [req.session.userId, req.params.bookId]
    );

    if (existing.length) {
      await pool.query(
        'DELETE FROM wishlist WHERE user_id = ? AND book_id = ?',
        [req.session.userId, req.params.bookId]
      );

      res.json({ action: 'removed' });

    } else {
      await pool.query(
        'INSERT INTO wishlist (user_id, book_id) VALUES (?,?)',
        [req.session.userId, req.params.bookId]
      );

      res.json({ action: 'added' });
    }

  } catch {
    res.status(500).json({ error: 'Wishlist update failed' });
  }
});

router.get('/check/:bookId', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id FROM wishlist WHERE user_id = ? AND book_id = ?',
      [req.session.userId, req.params.bookId]
    );

    res.json({ wishlisted: rows.length > 0 });

  } catch {
    res.json({ wishlisted: false });
  }
});

module.exports = router;