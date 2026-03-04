# 📚 Tales & Trails — Full-Stack Edition

> Where every Tale leads to a new Trail — now with MySQL database, persistent accounts, and powerful new features.

---

## 🚀 What's New in v2.0

### ✅ MySQL Database Integration

- **Persistent user accounts** — register once, login from anywhere, no duplicate accounts
- **Persistent cart** — your cart syncs across devices and sessions
- **Order history** — all orders stored permanently in the database
- **Secure authentication** — passwords hashed with bcryptjs, sessions via express-session

### 🆕 New Features

| Feature                    | Description                                                      |
| -------------------------- | ---------------------------------------------------------------- |
| **❤️ Wishlist**            | Save books for later, manage from dedicated Wishlist page        |
| **⭐ Reviews**             | Rate and review any book (1–5 stars + title + body)              |
| **📖 Book Detail Page**    | Full info: description, pages, publisher, year                   |
| **🔍 Similar Books**       | Auto-recommendations based on genre                              |
| **✏️ Edit Profile**        | Update name and change password from Account page                |
| **📊 Order Status**        | Orders show status: Confirmed → Processing → Shipped → Delivered |
| **🗂️ Profile Tabs**        | Order History, My Reviews, Edit Profile — all in one place       |
| **🔐 Session Persistence** | Stay logged in for 7 days                                        |

---

## 🛠️ Setup Instructions

### Prerequisites

- **Node.js** v16+
- **MySQL** v8.0+ (running locally or remote)

### 1. Install Dependencies

```bash
cd tales_trails_upgraded
npm install
```

### 2. Configure Database

```bash
# Copy the example env file
cp .env.example .env

# Edit .env and fill in your MySQL credentials
nano .env
```

Your `.env` should look like:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
PORT=3000
SESSION_SECRET=some-long-random-string
```

### 3. Initialize the Database

```bash
npm run db:setup
```

This creates the `tales_trails` database, all tables, seeds 15 books, and creates 2 demo users.

### 4. Start the Server

```bash
# Production
npm start

# Development (auto-restart on changes)
npm run dev
```

### 5. Open in Browser

```
http://localhost:3000
```

---

## 🗄️ Database Schema

```
users          — id, name, email, password_hash, avatar_letter
books          — id, title, author, price, category, rating, cover_url, description...
orders         — id, user_id, total, payment_method, status, shipping_address...
order_items    — id, order_id, book_id, quantity, unit_price
cart_items     — id, user_id, book_id, quantity  (persistent cross-device cart)
wishlist       — id, user_id, book_id
reviews        — id, user_id, book_id, rating, title, body
```

---

## 📡 API Endpoints

| Method | Endpoint                 | Description                                          |
| ------ | ------------------------ | ---------------------------------------------------- |
| POST   | `/api/auth/register`     | Register new user                                    |
| POST   | `/api/auth/login`        | Login                                                |
| POST   | `/api/auth/logout`       | Logout                                               |
| GET    | `/api/auth/me`           | Get current session user                             |
| PUT    | `/api/auth/profile`      | Update name / password                               |
| GET    | `/api/books`             | List books (filter by `?category=`, `?sort=`, `?q=`) |
| GET    | `/api/books/:id`         | Book detail + reviews                                |
| GET    | `/api/books/:id/similar` | Similar books by genre                               |
| POST   | `/api/books/:id/review`  | Add/update review                                    |
| GET    | `/api/cart`              | Get cart                                             |
| POST   | `/api/cart`              | Add to cart                                          |
| PUT    | `/api/cart/:bookId`      | Update quantity                                      |
| DELETE | `/api/cart/:bookId`      | Remove item                                          |
| DELETE | `/api/cart`              | Clear cart                                           |
| GET    | `/api/orders`            | User's order history                                 |
| POST   | `/api/orders`            | Place order                                          |
| GET    | `/api/wishlist`          | Get wishlist                                         |
| POST   | `/api/wishlist/:bookId`  | Toggle wishlist                                      |

---

## 🔑 Demo Credentials

| Email               | Password      |
| ------------------- | ------------- |
| `aanya@example.com` | `password123` |
| `jane@example.com`  | `password456` |

---

## 🏗️ Project Structure

```
tales_trails_upgraded/
├── server/
│   ├── index.js          # Express app entry point
│   ├── db/
│   │   ├── pool.js       # MySQL connection pool
│   │   └── setup.js      # DB initialization & seeding
│   └── routes/
│       ├── auth.js       # Login, register, profile
│       ├── books.js      # Books list, detail, reviews
│       ├── cart.js       # Cart CRUD
│       ├── orders.js     # Place & view orders
│       └── wishlist.js   # Wishlist toggle
├── public/
│   ├── index.html        # Main HTML
│   ├── style.css         # All styles
│   └── app.js            # Frontend JS (API-connected)
├── .env.example
├── package.json
└── README.md
```
