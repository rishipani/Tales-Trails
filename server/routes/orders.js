const express = require('express');
const pool = require('../db/pool');
const mailer = require('../mailer');

const router = express.Router();

const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Please sign in' });
  }
  next();
};

router.get('/', requireAuth, async (req, res) => {
  try {
    const [orders] = await pool.query(
      `SELECT o.*, 
      (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
      FROM orders o
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC`,
      [req.session.userId]
    );

    const ordersWithItems = await Promise.all(
      orders.map(async (o) => {
        const [items] = await pool.query(
          `SELECT oi.*, b.title, b.author, b.cover_url
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
    console.error('Orders error:', err);
    res.status(500).json({ error: 'Failed to load orders' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const [orders] = await pool.query(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [req.params.id, req.session.userId]
    );

    if (!orders.length) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const [items] = await pool.query(
      `SELECT oi.*, b.title, b.author, b.cover_url
      FROM order_items oi
      JOIN books b ON oi.book_id = b.id
      WHERE oi.order_id = ?`,
      [req.params.id]
    );

    res.json({
      order: { ...orders[0], items }
    });

  } catch {
    res.status(500).json({ error: 'Failed to load order' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { firstName, lastName, address, city, state, zipCode, paymentMethod } = req.body;

  if (!firstName || !address || !paymentMethod) {
    return res.status(400).json({ error: 'Missing required order fields' });
  }

  try {
    const [cartItems] = await pool.query(
      `SELECT ci.*, b.price, b.title
      FROM cart_items ci
      JOIN books b ON ci.book_id = b.id
      WHERE ci.user_id = ?`,
      [req.session.userId]
    );

    if (!cartItems.length) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const subtotal = cartItems.reduce(
      (s, i) => s + parseFloat(i.price) * i.quantity,
      0
    );

    const tax = subtotal * 0.08;
    const total = subtotal + tax;

    const orderId = 'TT-' + Date.now().toString(36).toUpperCase();

    const fullAddress = [address, city, state, zipCode]
      .filter(Boolean)
      .join(', ');

    await pool.query(
      `INSERT INTO orders
      (id, user_id, subtotal, tax, total, payment_method, status, first_name, last_name, address, city, state, zip_code)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        orderId,
        req.session.userId,
        subtotal,
        tax,
        total,
        paymentMethod,
        'confirmed',
        firstName,
        lastName,
        address,
        city,
        state,
        zipCode
      ]
    );

    const orderItemsForEmail = [];

    for (const item of cartItems) {
      await pool.query(
        'INSERT INTO order_items (order_id, book_id, quantity, unit_price) VALUES (?,?,?,?)',
        [orderId, item.book_id, item.quantity, item.price]
      );

      orderItemsForEmail.push({
        title: item.title,
        quantity: item.quantity,
        unit_price: parseFloat(item.price)
      });
    }

    await pool.query(
      'DELETE FROM cart_items WHERE user_id = ?',
      [req.session.userId]
    );

    const [userRows] = await pool.query(
      'SELECT name, email FROM users WHERE id = ?',
      [req.session.userId]
    );

    if (userRows.length) {
      mailer.sendOrderConfirmation(
        userRows[0].email,
        userRows[0].name,
        {
          orderId,
          items: orderItemsForEmail,
          subtotal,
          tax,
          total,
          paymentMethod,
          address: fullAddress
        }
      ).catch(err => console.warn('Order email failed:', err.message));
    }

    res.json({ success: true, orderId, total });

  } catch (err) {
    console.error('Place order error:', err);
    res.status(500).json({ error: 'Failed to place order' });
  }
});

module.exports = router;