require('dotenv').config({ quiet: true });

const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');

const mailer = require('./mailer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'tales-trails-secret-2025',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000
    }
  })
);

app.use(express.static(path.join(__dirname, '../public')));

app.use(
  express.static(path.join(__dirname, '../admin'), {
    index: false
  })
);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/books', require('./routes/books'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/wishlist', require('./routes/wishlist'));
app.use('/api/admin', require('./routes/admin'));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '3.0'
  });
});

app.get('/admin', async (req, res) => {

  if (!req.session.userId) {
    return res.redirect('/?unauthorized=1');
  }

  try {

    const pool = require('./db/pool');

    const [rows] = await pool.query(
      'SELECT role FROM users WHERE id = ?',
      [req.session.userId]
    );

    if (!rows.length || rows[0].role !== 'admin') {
      return res.redirect('/?unauthorized=1');
    }

    res.sendFile(path.join(__dirname, '../admin/index.html'));

  } catch (err) {

    res.redirect('/?unauthorized=1');

  }

});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, async () => {

  console.log('\nTales & Trails running at: http://localhost:' + PORT);

  await mailer.verifyConnection();

});