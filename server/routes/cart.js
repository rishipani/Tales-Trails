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
      `
      SELECT
        ci.id,
        ci.book_id,
        ci.quantity,
        b.title,
        b.author,
        b.price,
        b.original_price,
        b.cover_url,
        b.category
      FROM cart_items ci
      JOIN books b ON ci.book_id = b.id
      WHERE ci.user_id = ?
      `,
      [req.session.userId]
    );

    res.json({ items });

  } catch (err) {
    res.status(500).json({ error: 'Failed to load cart' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { bookId, quantity = 1 } = req.body;

  if (!bookId) {
    return res.status(400).json({ error: 'Book ID required' });
  }

  try {
    await pool.query(
      `
      INSERT INTO cart_items (user_id, book_id, quantity)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
      `,
      [req.session.userId, bookId, quantity]
    );

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: 'Failed to update cart' });
  }
});

router.put('/:bookId', requireAuth, async (req, res) => {
  const { quantity } = req.body;

  if (quantity <= 0) {
    await pool.query(
      'DELETE FROM cart_items WHERE user_id = ? AND book_id = ?',
      [req.session.userId, req.params.bookId]
    );
  } else {
    await pool.query(
      `
      INSERT INTO cart_items (user_id, book_id, quantity)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE quantity = VALUES(quantity)
      `,
      [req.session.userId, req.params.bookId, quantity]
    );
  }

  res.json({ success: true });
});

router.delete('/:bookId', requireAuth, async (req, res) => {
  await pool.query(
    'DELETE FROM cart_items WHERE user_id = ? AND book_id = ?',
    [req.session.userId, req.params.bookId]
  );

  res.json({ success: true });
});

router.delete('/', requireAuth, async (req, res) => {
  await pool.query(
    'DELETE FROM cart_items WHERE user_id = ?',
    [req.session.userId]
  );

  res.json({ success: true });
});

module.exports = router;