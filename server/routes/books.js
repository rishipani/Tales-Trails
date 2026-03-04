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
    const { category, sort, q } = req.query;

    let query = 'SELECT * FROM books WHERE 1=1';
    const params = [];

    if (category && category !== 'All') {
      query += ' AND category = ?';
      params.push(category);
    }

    if (q) {
      query += ' AND (title LIKE ? OR author LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }

    const sortMap = {
      'rating-desc': 'rating DESC',
      'name-asc': 'title ASC',
      'name-desc': 'title DESC',
      'price-asc': 'price ASC',
      'price-desc': 'price DESC'
    };

    query += ` ORDER BY ${sortMap[sort] || 'rating DESC'}`;

    const [books] = await pool.query(query, params);

    res.json({ books });

  } catch (err) {
    console.error('Books list error:', err);
    res.status(500).json({ error: 'Failed to load books' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const [books] = await pool.query(
      'SELECT * FROM books WHERE id = ?',
      [req.params.id]
    );

    if (!books.length) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const [reviews] = await pool.query(
      `SELECT r.*, u.name as user_name, u.avatar_letter
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.book_id = ?
       ORDER BY r.created_at DESC`,
      [req.params.id]
    );

    res.json({
      book: books[0],
      reviews
    });

  } catch (err) {
    res.status(500).json({ error: 'Failed to load book' });
  }
});

router.get('/:id/similar', requireAuth, async (req, res) => {
  try {
    const [books] = await pool.query(
      `SELECT * FROM books
       WHERE id != ?
       AND category = (SELECT category FROM books WHERE id = ?)
       LIMIT 4`,
      [req.params.id, req.params.id]
    );

    res.json({ books });

  } catch {
    res.json({ books: [] });
  }
});

router.post('/:id/review', requireAuth, async (req, res) => {
  const { rating, title, body } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be 1-5' });
  }

  try {
    await pool.query(
      `INSERT INTO reviews (user_id, book_id, rating, title, body)
       VALUES (?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
       rating = VALUES(rating),
       title = VALUES(title),
       body = VALUES(body)`,
      [req.session.userId, req.params.id, rating, title || null, body || null]
    );

    await pool.query(
      `UPDATE books
       SET rating = (SELECT AVG(rating) FROM reviews WHERE book_id = ?)
       WHERE id = ?`,
      [req.params.id, req.params.id]
    );

    res.json({ success: true });

  } catch (err) {
    console.error('Review error:', err);
    res.status(500).json({ error: 'Failed to save review' });
  }
});

module.exports = router;