require('dotenv').config({ quiet: true });
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const DB_CONFIG = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  multipleStatements: true
};

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@talesandtrails.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@TT2025";

const SCHEMA = `
CREATE DATABASE IF NOT EXISTS tales_trails
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE tales_trails;

CREATE TABLE IF NOT EXISTS users (
 id INT AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(100) NOT NULL,
 email VARCHAR(150) UNIQUE NOT NULL,
 password_hash VARCHAR(255) NOT NULL,
 avatar_letter CHAR(1) DEFAULT 'A',
 role ENUM('user','admin') DEFAULT 'user',
 is_banned BOOLEAN DEFAULT FALSE,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 INDEX idx_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS books (
 id INT AUTO_INCREMENT PRIMARY KEY,
 title VARCHAR(255) NOT NULL,
 author VARCHAR(150) NOT NULL,
 price DECIMAL(10,2) NOT NULL,
 original_price DECIMAL(10,2) NOT NULL,
 category VARCHAR(80) NOT NULL,
 rating DECIMAL(3,1) DEFAULT 0.0,
 cover_url TEXT,
 description TEXT,
 pages INT DEFAULT 0,
 publisher VARCHAR(150),
 year INT,
 stock INT DEFAULT 50,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_category (category),
 FULLTEXT idx_search (title, author)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS orders (
 id VARCHAR(32) PRIMARY KEY,
 user_id INT NOT NULL,
 subtotal DECIMAL(10,2) NOT NULL,
 tax DECIMAL(10,2) NOT NULL,
 total DECIMAL(10,2) NOT NULL,
 payment_method ENUM('cod','card','upi') NOT NULL,
 status ENUM('pending','confirmed','processing','shipped','delivered','cancelled') DEFAULT 'confirmed',
 first_name VARCHAR(80),
 last_name VARCHAR(80),
 address TEXT,
 city VARCHAR(80),
 state VARCHAR(80),
 zip_code VARCHAR(20),
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
 INDEX idx_user (user_id),
 INDEX idx_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_items (
 id INT AUTO_INCREMENT PRIMARY KEY,
 order_id VARCHAR(32) NOT NULL,
 book_id INT NOT NULL,
 quantity INT NOT NULL,
 unit_price DECIMAL(10,2) NOT NULL,
 FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
 FOREIGN KEY (book_id) REFERENCES books(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cart_items (
 id INT AUTO_INCREMENT PRIMARY KEY,
 user_id INT NOT NULL,
 book_id INT NOT NULL,
 quantity INT NOT NULL DEFAULT 1,
 added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY unique_cart_item (user_id, book_id),
 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
 FOREIGN KEY (book_id) REFERENCES books(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS wishlist (
 id INT AUTO_INCREMENT PRIMARY KEY,
 user_id INT NOT NULL,
 book_id INT NOT NULL,
 added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY unique_wishlist (user_id, book_id),
 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
 FOREIGN KEY (book_id) REFERENCES books(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reviews (
 id INT AUTO_INCREMENT PRIMARY KEY,
 user_id INT NOT NULL,
 book_id INT NOT NULL,
 rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
 title VARCHAR(150),
 body TEXT,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY unique_review (user_id, book_id),
 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
 FOREIGN KEY (book_id) REFERENCES books(id),
 INDEX idx_book (book_id)
) ENGINE=InnoDB;
`;

async function setup() {
  console.log("Setting up Tales & Trails database...\n");

  let conn;

  try {
    conn = await mysql.createConnection(DB_CONFIG);

    console.log("Connected to MySQL");

    await conn.query(SCHEMA);

    console.log("Database schema created");

    const [existingAdmin] = await conn.query(
      "SELECT id FROM tales_trails.users WHERE role='admin' LIMIT 1"
    );

    if (!existingAdmin.length) {
      const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);

      await conn.query(
        `INSERT INTO tales_trails.users
        (name, email, password_hash, avatar_letter, role)
        VALUES (?, ?, ?, ?, 'admin')`,
        ["Admin", ADMIN_EMAIL, hash, "A"]
      );

      console.log("Admin account created");
    } else {
      console.log("Admin already exists");
    }

    console.log("\nSetup complete");
    console.log("\nAdmin credentials:");
    console.log(`Email: ${ADMIN_EMAIL}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);

  } catch (err) {
    console.error("Setup error:", err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

setup();