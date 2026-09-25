import dotenv from 'dotenv';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: true });
}

export const DEFAULT_DATABASE_NAME = 'openmarket';
export const DEFAULT_DATABASE_URL = `postgresql://postgres:rakib+1123@localhost:5432/${DEFAULT_DATABASE_NAME}`;

const getDatabaseUrl = () => process.env.DATABASE_URL || DEFAULT_DATABASE_URL;

const getDatabaseName = (connectionString = getDatabaseUrl()) => {
  const url = new URL(connectionString);
  return url.pathname.replace(/^\//, '') || DEFAULT_DATABASE_NAME;
};

const getMaintenanceUrl = (connectionString = getDatabaseUrl()) => {
  const url = new URL(connectionString);
  const dbName = getDatabaseName(connectionString);
  url.pathname = `/${dbName === 'postgres' ? 'template1' : 'postgres'}`;
  return url.toString();
};

const quoteIdentifier = (value) => `"${String(value).replace(/"/g, '""')}"`;

export const createAppPool = () => new Pool({ connectionString: getDatabaseUrl() });

export const ensureDatabaseExists = async () => {
  const connectionString = getDatabaseUrl();
  const dbName = getDatabaseName(connectionString);
  const maintenancePool = new Pool({ connectionString: getMaintenanceUrl(connectionString) });

  try {
    const existing = await maintenancePool.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (!existing.rowCount) {
      await maintenancePool.query(`CREATE DATABASE ${quoteIdentifier(dbName)}`);
      console.log(`Database created: ${dbName}`);
    }
  } finally {
    await maintenancePool.end();
  }
};

export const createSchema = async (pool) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      name TEXT,
      phone TEXT,
      address TEXT,
      profile_picture TEXT,
      role TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '30 days'
    );

    CREATE TABLE IF NOT EXISTS entities (
      id TEXT PRIMARY KEY,
      entity TEXT NOT NULL,
      data JSONB NOT NULL,
      created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS verification_codes (
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      purpose TEXT NOT NULL DEFAULT 'password_reset',
      attempts INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS wishlist (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL,
      added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id, product_id)
    );

    CREATE INDEX IF NOT EXISTS idx_entities_entity_created_date ON entities(entity, created_date DESC);
    CREATE INDEX IF NOT EXISTS idx_entities_data_gin ON entities USING GIN (data);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_verification_codes_email_code ON verification_codes(email, code);
  `);

  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT');
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture TEXT');
  await pool.query('ALTER TABLE entities ADD COLUMN IF NOT EXISTS updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()');
  await pool.query("ALTER TABLE verification_codes ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'password_reset'");
  await pool.query('ALTER TABLE verification_codes ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0');
  await pool.query('ALTER TABLE verification_codes ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()');
};

const defaultCategories = [
  'Electronics',
  'Fashion',
  'Home & Living',
  'Beauty',
  'Sports',
  'Groceries',
  'Toys',
  'Books',
  'Automotive',
];

const defaultDeliveryLocations = {
  divisions: [
    {
      id: 'dhaka',
      name: 'Dhaka',
      districts: [
        {
          id: 'dhaka',
          name: 'Dhaka',
          default_fee: 80,
          fast_fee: 120,
          areas: [
            { id: 'mirpur', name: 'Mirpur', default_fee: 60, fast_fee: 90 },
            { id: 'uttara', name: 'Uttara', default_fee: 70, fast_fee: 100 },
          ],
        },
      ],
    },
  ],
  unknown_area_fee: {
    default_fee: 150,
    fast_fee: 200,
  },
};

const siteSettings = [
  ['store_name', 'Open Market BD'],
  ['store_tagline', "Bangladesh's Modern Marketplace"],
  ['store_country', 'Bangladesh'],
  ['store_logo', ''],
  ['contact_phone', '+880 1700-000000'],
  ['contact_email', 'support@openmarketbd.com'],
  ['contact_address', 'Dhaka, Bangladesh'],
  ['facebook_url', ''],
  ['instagram_url', ''],
  ['youtube_url', ''],
  ['website_url', ''],
  ['announcement_text', 'Free delivery on orders above Tk 999 | Cash on Delivery Available Nationwide'],
  ['return_policy', 'We offer a 7-day return policy for eligible products. Items must be in original condition.'],
  ['privacy_policy', 'We respect your privacy. Your personal information is kept secure and never shared.'],
  ['terms_conditions', 'By using Open Market BD, you agree to our terms and conditions.'],
  ['shipping_info', 'Standard delivery: 2-5 business days. Express delivery available in Dhaka.'],
  ['max_image_size_mb', '2'],
  // legacy category settings removed; categories are seeded as Category entities instead
  ['delivery_locations_json', JSON.stringify(defaultDeliveryLocations)],
];

const seedEntities = [
  ...siteSettings.map(([key, value]) => ({
    entity: 'SiteSettings',
    unique: { key },
    data: { key, value, type: 'text', label: key },
  })),
  { entity: 'Banner', unique: { title: 'Open Market BD' }, data: { title: 'Open Market BD', subtitle: 'Local marketplace for sellers and buyers', image: '', position: 'hero', is_active: true, sort_order: 1 } },
  { entity: 'FAQ', unique: { question: 'How do I place an order?' }, data: { question: 'How do I place an order?', answer: 'Add items to your cart, proceed to checkout, and submit your order.', is_active: true, sort_order: 1 } },
  { entity: 'FAQ', unique: { question: 'Can I sell products?' }, data: { question: 'Can I sell products?', answer: 'Register as a seller from the seller dashboard and start listing products.', is_active: true, sort_order: 2 } },
  ...defaultCategories.map((name) => ({
    entity: 'Category',
    unique: { name },
    data: { name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''), is_active: true },
  })),
  { entity: 'Seller', unique: { store_name: 'Open Market Seller' }, data: { store_name: 'Open Market Seller', name: 'Open Market Seller', user_id: null, status: 'approved' } },
  { entity: 'Product', unique: { name: 'Smartphone X' }, data: { name: 'Smartphone X', category: 'Electronics', description: 'A powerful mobile phone with modern features.', price: 19999, images: [], is_active: true, approval_status: 'approved', seller_id: null, seller_name: 'Open Market Seller', sold_count: 12, stock: 30 } },
  { entity: 'Product', unique: { name: 'Wireless Headphones' }, data: { name: 'Wireless Headphones', category: 'Electronics', description: 'Comfortable and high quality wireless headphones.', price: 3999, images: [], is_active: true, approval_status: 'approved', seller_id: null, seller_name: 'Open Market Seller', sold_count: 8, stock: 50 } },
];

const entityExists = async (pool, entity, unique) => {
  const conditions = ['entity = $1'];
  const values = [entity];
  let index = 2;

  for (const [key, value] of Object.entries(unique)) {
    conditions.push(`data->>'${key}' = $${index}`);
    values.push(String(value));
    index += 1;
  }

  return pool.query(`SELECT id FROM entities WHERE ${conditions.join(' AND ')} LIMIT 1`, values);
};

export const seedDatabase = async (pool) => {
  for (const item of seedEntities) {
    const existing = await entityExists(pool, item.entity, item.unique);
    if (!existing.rowCount) {
      await pool.query(
        'INSERT INTO entities(id, entity, data) VALUES ($1, $2, $3)',
        [crypto.randomUUID(), item.entity, item.data]
      );
    }
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    const normalized = String(adminEmail).trim().toLowerCase();
    const hash = await bcrypt.hash(String(adminPassword), 10);
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [normalized]);
    if (existing.rowCount) {
      await pool.query('UPDATE users SET password_hash = $1, role = $2, updated_at = NOW() WHERE email = $3', [hash, 'admin', normalized]);
      console.log('Admin user updated from env:', normalized);
    } else {
      await pool.query(
        'INSERT INTO users(email, password_hash, name, role) VALUES ($1, $2, $3, $4)',
        [normalized, hash, normalized.split('@')[0], 'admin']
      );
      console.log('Admin user created from env:', normalized);
    }
  }
};

export const initDatabase = async (pool) => {
  await ensureDatabaseExists();
  await createSchema(pool);
  await seedDatabase(pool);
};

export const installAutoDatabaseRepair = (pool) => {
  const originalQuery = pool.query.bind(pool);
  let repairPromise = null;
  const repairableCodes = new Set(['42P01', '42703']);

  pool.query = async (...args) => {
    try {
      return await originalQuery(...args);
    } catch (error) {
      if (!repairableCodes.has(error.code)) {
        throw error;
      }

      if (!repairPromise) {
        repairPromise = (async () => {
          console.warn(`Database structure missing (${error.code}). Rebuilding schema and seed data...`);
          await createSchema({ query: originalQuery });
          await seedDatabase({ query: originalQuery });
        })().finally(() => {
          repairPromise = null;
        });
      }

      await repairPromise;
      return originalQuery(...args);
    }
  };

  return pool;
};
