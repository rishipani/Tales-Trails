const express = require('express');
const pool = require('../db/pool');

const router = express.Router();

const requireAdmin = async (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT role FROM users WHERE id = ?',
      [req.session.userId]
    );

    if (!rows.length || rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();

  } catch (err) {
    res.status(500).json({ error: 'Auth check failed' });
  }
};

router.get('/verify', requireAdmin, (req, res) => {
  res.json({ admin: true });
});

router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const [[{ totalUsers }]] = await pool.query(
      'SELECT COUNT(*) as totalUsers FROM users WHERE role = "user"'
    );

    const [[{ totalBooks }]] = await pool.query(
      'SELECT COUNT(*) as totalBooks FROM books'
    );

    const [[{ totalOrders }]] = await pool.query(
      'SELECT COUNT(*) as totalOrders FROM orders'
    );

    const [[{ totalRevenue }]] = await pool.query(
      'SELECT COALESCE(SUM(total),0) as totalRevenue FROM orders'
    );

    const [[{ todayOrders }]] = await pool.query(
      'SELECT COUNT(*) as todayOrders FROM orders WHERE DATE(created_at) = CURDATE()'
    );

    const [[{ todayRevenue }]] = await pool.query(
      'SELECT COALESCE(SUM(total),0) as todayRevenue FROM orders WHERE DATE(created_at) = CURDATE()'
    );

    const [recentOrders] = await pool.query(
      `SELECT o.id, o.total, o.status, o.created_at, u.name as user_name
       FROM orders o
       JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC
       LIMIT 8`
    );

    const [topBooks] = await pool.query(
      `SELECT b.title, b.author, b.cover_url, SUM(oi.quantity) as sold
       FROM order_items oi
       JOIN books b ON oi.book_id = b.id
       GROUP BY b.id
       ORDER BY sold DESC
       LIMIT 5`
    );

    const [ordersByStatus] = await pool.query(
      'SELECT status, COUNT(*) as count FROM orders GROUP BY status'
    );

    res.json({
      totalUsers,
      totalBooks,
      totalOrders,
      totalRevenue,
      todayOrders,
      todayRevenue,
      recentOrders,
      topBooks,
      ordersByStatus
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

router.get('/books', requireAdmin, async (req, res) => {
  try {
    const { q, category } = req.query;

    let query = 'SELECT * FROM books WHERE 1=1';
    const params = [];

    if (q) {
      query += ' AND (title LIKE ? OR author LIKE ?)';
      params.push('%' + q + '%', '%' + q + '%');
    }

    if (category && category !== 'All') {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY created_at DESC';

    const [books] = await pool.query(query, params);

    res.json({ books });

  } catch (err) {
    res.status(500).json({ error: 'Failed to load books' });
  }
});

router.post('/books', requireAdmin, async (req, res) => {
  const {
    title,
    author,
    price,
    original_price,
    category,
    rating,
    cover_url,
    description,
    pages,
    publisher,
    year,
    stock
  } = req.body;

  if (!title || !author || !price || !category) {
    return res.status(400).json({
      error: 'Title, author, price and category are required'
    });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO books
      (title, author, price, original_price, category, rating, cover_url, description, pages, publisher, year, stock)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        title,
        author,
        price,
        original_price || price,
        category,
        rating || 0,
        cover_url || '',
        description || '',
        pages || 0,
        publisher || '',
        year || null,
        stock || 50
      ]
    );

    const [rows] = await pool.query(
      'SELECT * FROM books WHERE id = ?',
      [result.insertId]
    );

    res.json({ success: true, book: rows[0] });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add book' });
  }
});

router.put('/books/:id', requireAdmin, async (req, res) => {
  const {
    title,
    author,
    price,
    original_price,
    category,
    rating,
    cover_url,
    description,
    pages,
    publisher,
    year,
    stock
  } = req.body;

  try {
    await pool.query(
      `UPDATE books
       SET title=?, author=?, price=?, original_price=?, category=?, rating=?, cover_url=?, description=?, pages=?, publisher=?, year=?, stock=?
       WHERE id=?`,
      [
        title,
        author,
        price,
        original_price,
        category,
        rating,
        cover_url,
        description,
        pages,
        publisher,
        year,
        stock,
        req.params.id
      ]
    );

    const [rows] = await pool.query(
      'SELECT * FROM books WHERE id = ?',
      [req.params.id]
    );

    res.json({ success: true, book: rows[0] });

  } catch (err) {
    res.status(500).json({ error: 'Failed to update book' });
  }
});

router.delete('/books/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM books WHERE id = ?',
      [req.params.id]
    );

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: 'Failed to delete book' });
  }
});

router.get('/users', requireAdmin, async (req, res) => {
  try {
    const { q } = req.query;

    let query =
      `SELECT u.id, u.name, u.email, u.avatar_letter, u.role, u.is_banned, u.created_at,
       COUNT(DISTINCT o.id) as order_count,
       COALESCE(SUM(o.total),0) as total_spent
       FROM users u
       LEFT JOIN orders o ON u.id = o.user_id
       WHERE 1=1`;

    const params = [];

    if (q) {
      query += ' AND (u.name LIKE ? OR u.email LIKE ?)';
      params.push('%' + q + '%', '%' + q + '%');
    }

    query += ' GROUP BY u.id ORDER BY u.created_at DESC';

    const [users] = await pool.query(query, params);

    res.json({ users });

  } catch (err) {
    res.status(500).json({ error: 'Failed to load users' });
  }
});

router.get('/users/:id', requireAdmin, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, name, email, avatar_letter, role, is_banned, created_at FROM users WHERE id = ?',
      [req.params.id]
    );

    if (!users.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    const [orders] = await pool.query(
      `SELECT o.*, GROUP_CONCAT(b.title SEPARATOR ", ") as book_titles
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN books b ON oi.book_id = b.id
       WHERE o.user_id = ?
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [req.params.id]
    );

    res.json({
      user: users[0],
      orders
    });

  } catch (err) {
    res.status(500).json({ error: 'Failed to load user' });
  }
});

router.patch('/users/:id/ban', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT is_banned, role FROM users WHERE id = ?',
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (rows[0].role === 'admin') {
      return res.status(400).json({ error: 'Cannot ban an admin' });
    }

    const newBanned = rows[0].is_banned ? 0 : 1;

    await pool.query(
      'UPDATE users SET is_banned = ? WHERE id = ?',
      [newBanned, req.params.id]
    );

    res.json({
      success: true,
      is_banned: newBanned
    });

  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT role FROM users WHERE id = ?',
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (rows[0].role === 'admin') {
      return res.status(400).json({ error: 'Cannot delete an admin account' });
    }

    await pool.query(
      'DELETE FROM users WHERE id = ?',
      [req.params.id]
    );

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

router.get('/orders', requireAdmin, async (req, res) => {
  try {
    const { status, q } = req.query;

    let query =
      `SELECT o.*, u.name as user_name, u.email as user_email
       FROM orders o
       JOIN users u ON o.user_id = u.id
       WHERE 1=1`;

    const params = [];

    if (status && status !== 'all') {
      query += ' AND o.status = ?';
      params.push(status);
    }

    if (q) {
      query += ' AND (o.id LIKE ? OR u.name LIKE ? OR u.email LIKE ?)';
      params.push('%' + q + '%', '%' + q + '%', '%' + q + '%');
    }

    query += ' ORDER BY o.created_at DESC';

    const [orders] = await pool.query(query, params);

    const ordersWithItems = await Promise.all(
      orders.map(async (o) => {
        const [items] = await pool.query(
          `SELECT oi.*, b.title, b.cover_url
           FROM order_items oi
           JOIN books b ON oi.book_id = b.id
           WHERE oi.order_id = ?`,
          [o.id]
        );

        return { ...o, items };
      })
    );

    res.json({ orders: ordersWithItems });

  } catch (err) {
    res.status(500).json({ error: 'Failed to load orders' });
  }
});

router.patch('/orders/:id/status', requireAdmin, async (req, res) => {
  const { status } = req.body;

  const valid = [
    'pending',
    'confirmed',
    'processing',
    'shipped',
    'delivered',
    'cancelled'
  ];

  if (!valid.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    await pool.query(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, req.params.id]
    );

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

module.exports = router;