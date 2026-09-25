import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { createAppPool, initDatabase as initAppDatabase, installAutoDatabaseRepair } from './database.js';
import { parseOrder } from './security-utils.js';
import { invalidateEntityCache } from '../src/server/cache.js';

dotenv.config();

const PORT = process.env.PORT || 4000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_URL = process.env.FRONTEND_URL || process.env.VITE_APP_URL || 'http://localhost:3000';
const DEFAULT_GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || `http://localhost:${PORT}/api/auth/oauth/google/callback`;
const SSL_KEY_PATH = process.env.SSL_KEY_PATH;
const SSL_CERT_PATH = process.env.SSL_CERT_PATH;
const SSL_CA_PATH = process.env.SSL_CA_PATH;

// If a .env.local exists in the project root, load it to override values
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Configure email transporter if SMTP settings provided
let transporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const pool = installAutoDatabaseRepair(createAppPool());

const app = express();
app.use(cors({origin: ['http://localhost:5173','http://127.0.0.1:5173',FRONTEND_URL],credentials: true}));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/uploads', express.static(uploadDir));
app.use('/api/uploads', express.static(uploadDir));

const isValidName = (name) => /^[A-Za-z0-9_]+$/.test(name);
const ensureSnake = (key) => /^[A-Za-z0-9_]+$/.test(key);

const mapRow = (row) => ({ id: row.id, ...row.data, created_date: row.created_date });

const mapUserRow = (row) => ({
  id: row.id,
  email: row.email,
  name: row.name,
  full_name: row.name,
  phone: row.phone,
  address: row.address,
  profile_picture: row.profile_picture,
  role: row.role,
  created_at: row.created_at,
});

const uploadUrlPrefix = '/api/uploads/';
const localUploadHosts = new Set(['localhost', '127.0.0.1', '::1']);

const normalizeUploadUrl = (value) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  if (trimmed.startsWith('/uploads/')) {
    return `/api${trimmed}`;
  }
  if (trimmed.startsWith('uploads/')) {
    return `/api/${trimmed}`;
  }
  if (trimmed.startsWith('api/uploads/')) {
    return `/${trimmed}`;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (localUploadHosts.has(parsed.hostname) && (parsed.pathname.startsWith('/api/uploads/') || parsed.pathname.startsWith('/uploads/'))) {
        const pathname = parsed.pathname.startsWith('/uploads/') ? `/api${parsed.pathname}` : parsed.pathname;
        return `${pathname}${parsed.search}${parsed.hash}`;
      }
    } catch {
      return trimmed;
    }
  }

  return trimmed;
};

const normalizeUploadUrlsInData = (value) => {
  if (typeof value === 'string') return normalizeUploadUrl(value);
  if (Array.isArray(value)) return value.map(normalizeUploadUrlsInData);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, nestedValue]) => [key, normalizeUploadUrlsInData(nestedValue)]));
  }
  return value;
};

const extractUploadUrls = (value) => {
  if (typeof value === 'string') {
    const normalized = normalizeUploadUrl(value);
    return normalized.startsWith(uploadUrlPrefix) ? [normalized] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap(extractUploadUrls);
  }
  if (value && typeof value === 'object') {
    return Object.values(value).flatMap(extractUploadUrls);
  }
  return [];
};

const resolveUploadFilePath = (fileUrl) => {
  if (!fileUrl || typeof fileUrl !== 'string') return null;
  const normalized = normalizeUploadUrl(fileUrl);
  const index = normalized.indexOf(uploadUrlPrefix);
  if (index === -1) return null;
  const relativePath = normalized
    .slice(index + uploadUrlPrefix.length)
    .split(/[?#]/)[0];
  const filePath = path.resolve(uploadDir, relativePath);
  const uploadRoot = path.resolve(uploadDir);
  if (filePath !== uploadRoot && !filePath.startsWith(`${uploadRoot}${path.sep}`)) {
    return null;
  }
  return filePath;
};

const deleteUploadFile = async (fileUrl) => {
  const filePath = resolveUploadFilePath(fileUrl);
  if (!filePath) return false;
  try {
    await fs.promises.unlink(filePath);
    return true;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Failed to delete upload file:', fileUrl, error);
    }
    return false;
  }
};

const countUploadUrlReferences = async (fileUrl) => {
  const normalized = normalizeUploadUrl(fileUrl);
  if (!normalized.startsWith(uploadUrlPrefix)) return 0;
  const [userRefs, entityRefs] = await Promise.all([
    pool.query('SELECT COUNT(*)::int AS count FROM users WHERE profile_picture = $1', [normalized]),
    pool.query('SELECT COUNT(*)::int AS count FROM entities WHERE data::text LIKE $1', [`%${normalized}%`]),
  ]);
  return Number(userRefs.rows[0].count || 0) + Number(entityRefs.rows[0].count || 0);
};

const deleteUploadFileIfUnused = async (fileUrl) => {
  const normalized = normalizeUploadUrl(fileUrl);
  if (!normalized.startsWith(uploadUrlPrefix)) return false;
  const referenceCount = await countUploadUrlReferences(normalized);
  if (referenceCount > 0) return false;
  return deleteUploadFile(normalized);
};

const deleteUploadFilesIfUnused = async (urls) => {
  const uniqueUrls = [...new Set(urls.map(normalizeUploadUrl).filter((url) => typeof url === 'string' && url.startsWith(uploadUrlPrefix)))];
  await Promise.all(uniqueUrls.map(deleteUploadFileIfUnused));
};

const getRemovedUploadUrls = (oldData, newData) => {
  const oldUrls = new Set(extractUploadUrls(oldData));
  const newUrls = new Set(extractUploadUrls(newData));
  return [...oldUrls].filter((url) => !newUrls.has(url));
};

const getSessionUser = async (req) => {
  const sessionId = req.cookies?.session_id;
  if (!sessionId) return null;
  const session = await pool.query('SELECT user_id FROM sessions WHERE id = $1 AND expires_at > NOW()', [sessionId]);
  if (!session.rowCount) return null;
  const result = await pool.query('SELECT id, email, name, phone, address, profile_picture, role, created_at FROM users WHERE id = $1', [session.rows[0].user_id]);
  return result.rowCount ? mapUserRow(result.rows[0]) : null;
};

const getOptionalSessionUser = async (req) => getSessionUser(req).catch(() => null);
const isAdmin = (user) => user?.role === 'admin';
const isStaff = (user) => ['admin', 'employee', 'staff'].includes(user?.role);

const normalizePermissionList = (value) => Array.isArray(value) ? value.filter(Boolean) : [];

const getActiveStaffPermissions = async (user) => {
  if (!user?.email) return [];
  const result = await pool.query(
    "SELECT data FROM entities WHERE entity = 'StaffPermission' AND data->>'user_email' = $1 AND data->>'is_active' = 'true' ORDER BY created_date DESC LIMIT 1",
    [normalizeEmail(user.email)]
  );
  if (!result.rowCount) return [];
  return normalizePermissionList(result.rows[0].data?.permissions || []);
};

const getRequiredPermissionForEntity = (entity, action, payload = {}) => {
  if (entity === 'Order') return 'orders';
  if (entity === 'Product') {
    const productKeys = Object.keys(payload || {});
    if (productKeys.length > 0 && productKeys.every((key) => key === 'stock')) return 'inventory';
    return 'products';
  }
  if (entity === 'Seller') return 'sellers';
  if (entity === 'Coupon') return 'coupons';
  if (entity === 'Banner') return 'banners';
  if (entity === 'ContactMessage') return 'messages';
  if (entity === 'Review') return 'reviews';
  if (entity === 'ProductChat') return 'chats';
  if (entity === 'FAQ') return 'faq';
  if (entity === 'FlashSaleRequest') return 'flash_sales';
  if (entity === 'SiteSettings') return 'settings';
  if (entity === 'StaffPermission') return 'staff';
  if (entity === 'User') return 'users';
  return null;
};

const logSecurityAlert = ({ userEmail, userName, attemptedPermission, pathname, reason }) => {
  console.warn('[SECURITY_ALERT]', {
    userEmail: userEmail || 'unknown',
    userName: userName || 'unknown',
    attemptedPermission: attemptedPermission || 'unknown',
    pathname: pathname || 'unknown',
    reason: reason || 'permission_denied',
    timestamp: new Date().toISOString(),
  });
};

const ensureStaffEntityPermission = async (user, entity, action, payload = {}) => {
  if (!user || !isStaff(user) || isAdmin(user)) return;
  const requiredPermission = getRequiredPermissionForEntity(entity, action, payload);
  if (!requiredPermission) return;

  const permissions = await getActiveStaffPermissions(user);
  if (permissions.includes(requiredPermission)) return;

  logSecurityAlert({
    userEmail: user.email,
    userName: user.name || user.full_name,
    attemptedPermission: requiredPermission,
    pathname: `/admin/${entity.toLowerCase()}`,
    reason: `staff lacks ${requiredPermission} permission`,
  });

  const error = new Error(`Permission denied. This account is not allowed to manage ${requiredPermission}.`);
  error.status = 403;
  error.code = 'STAFF_PERMISSION_DENIED';
  throw error;
};

const requireAuth = async (req, res, next) => {
  const user = await getSessionUser(req);
  if (!user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  req.user = user;
  next();
};

const requireRole = (roles) => async (req, res, next) => {
  const user = await getSessionUser(req);
  if (!user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  if (!roles.includes(user.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  req.user = user;
  next();
};

const assertEntityName = (entity) => {
  if (!isValidName(entity)) {
    const error = new Error('Invalid entity name');
    error.status = 400;
    throw error;
  }
};

const rateLimitBuckets = new Map();
const checkRateLimit = (key, limit, windowMs) => {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
};

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const makeCode = () => String(crypto.randomInt(100000, 1000000));
const getClientKey = (req) => req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
const shouldShowVerificationCode = () => process.env.SHOW_VERIFICATION_CODES === 'true';
const requiresTwoFactorForRole = (role) => ['admin', 'staff', 'employee'].includes(role);
const setSessionCookie = (res, sessionId) => {
  res.cookie('session_id', sessionId, {
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
};
const createSessionForUser = async (res, user) => {
  const sessionId = crypto.randomUUID();
  await pool.query('INSERT INTO sessions(id, user_id) VALUES ($1, $2)', [sessionId, user.id]);
  setSessionCookie(res, sessionId);
  return sessionId;
};
const maybeRequireAdminVerification = async (req, res, user, options = {}) => {
  const mode = options.mode || 'json';
  if (process.env.REQUIRE_2FA !== 'true' || !requiresTwoFactorForRole(user?.role)) {
    return null;
  }

  if (!checkRateLimit(`admin-login-2fa:${user.email}`, 5, 15 * 60 * 1000)) {
    if (mode === 'redirect') {
      return { pending: true, redirectUrl: `${FRONTEND_URL}/login?error=too_many_requests` };
    }
    res.status(429).json({ message: 'Too many verification code requests. Try again later.' });
    return 'rate-limited';
  }

  const meta = await sendVerificationCode({
    email: user.email,
    purpose: 'admin_login',
    subject: 'Your Open Market BD verification code',
  });

  if (mode === 'redirect') {
    const redirectUrl = new URL('/login', FRONTEND_URL);
    redirectUrl.searchParams.set('two_factor_required', 'true');
    redirectUrl.searchParams.set('email', user.email);
    if (options.redirect) {
      redirectUrl.searchParams.set('redirect', options.redirect);
    }
    return { pending: true, redirectUrl: redirectUrl.toString() };
  }

  const payload = { two_factor_required: true, message: 'Verification code sent to email' };
  if (shouldShowVerificationCode()) {
    payload.code = meta.code;
  }
  res.json(payload);
  return 'pending';
};

const sendVerificationCode = async ({ email, purpose, subject }) => {
  const code = makeCode();
  const expiryMinutes = 10;
  const expires = new Date(Date.now() + expiryMinutes * 60 * 1000);
  await pool.query(
    'INSERT INTO verification_codes(email, code, expires_at, purpose) VALUES ($1, $2, $3, $4)',
    [email, code, expires, purpose]
  );
  if (transporter) {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject,
      text: `Your verification code is: ${code}\n\nThis code will expire in ${expiryMinutes} minutes.`,
    });
  } else {
    // Log the numeric code only when explicitly enabled for development.
    if (shouldShowVerificationCode()) {
      console.log(`${purpose} code generated for ${email} code= ${code} (expires in ${expiryMinutes} minutes)`);
    } else {
      console.log(`${purpose} code generated for ${email} (expires in ${expiryMinutes} minutes)`);
    }
  }
  const meta = { expires_in_seconds: expiryMinutes * 60 };
  if (shouldShowVerificationCode()) meta.code = code;
  return meta;
};

const verifyCode = async ({ email, code, purpose }) => {
  const result = await pool.query(
    'SELECT ctid, expires_at, attempts FROM verification_codes WHERE email = $1 AND code = $2 AND purpose = $3 ORDER BY expires_at DESC LIMIT 1',
    [email, String(code), purpose]
  );
  if (!result.rowCount) {
    const error = new Error('Invalid verification code');
    error.status = 400;
    throw error;
  }

  const record = result.rows[0];
  if (Number(record.attempts) >= 5) {
    const error = new Error('Too many verification attempts. Request a new code.');
    error.status = 429;
    throw error;
  }
  if (new Date(record.expires_at) < new Date()) {
    const error = new Error('Code has expired. Request a new code.');
    error.status = 400;
    throw error;
  }

  await pool.query('UPDATE verification_codes SET attempts = attempts + 1 WHERE ctid = $1', [record.ctid]);
};

const publicEntityPredicates = {
  Product: (data) => data?.is_active === true && data?.approval_status === 'approved',
  Banner: (data) => data?.is_active === true,
  FAQ: (data) => data?.is_active === true,
  Category: (data) => data?.is_active !== false,
  Seller: (data) => data?.status === 'approved',
  SiteSettings: () => true,
  Review: (data) => data?.is_approved === true,
  Coupon: (data) => data?.is_active === true,
};

const applyReadableRows = async (req, entity, rows) => {
  const user = await getOptionalSessionUser(req);
  const mappedRows = rows.map(mapRow);
  if (isAdmin(user)) return mappedRows;

  if (entity === 'StaffPermission' && user && isStaff(user) && !isAdmin(user)) {
    return mappedRows.filter((row) => normalizeEmail(row.user_email) === normalizeEmail(user.email));
  }

  const publicPredicate = publicEntityPredicates[entity];
  if (publicPredicate && ['Banner', 'FAQ', 'Category', 'Coupon', 'SiteSettings'].includes(entity)) {
    return mappedRows.filter(publicPredicate);
  }

  if (publicPredicate && entity === 'Seller') {
    if (!user) return mappedRows.filter(publicPredicate);
    return mappedRows.filter((seller) => publicPredicate(seller) || String(seller.user_id) === String(user.id));
  }

  if (publicPredicate && entity === 'Product') {
    if (!user) return mappedRows.filter(publicPredicate);
    const sellerIds = await getSellerIdsForUser(user.id);
    return mappedRows.filter((product) => publicPredicate(product) || sellerIds.has(String(product.seller_id)));
  }

  if (publicPredicate && entity === 'Review') {
    if (!user) return mappedRows.filter(publicPredicate);
    const sellerIds = await getSellerIdsForUser(user.id);
    let sellerProductIds = new Set();
    if (sellerIds.size) {
      const products = await pool.query(
        "SELECT id FROM entities WHERE entity = 'Product' AND data->>'seller_id' = ANY($1::text[])",
        [[...sellerIds]]
      );
      sellerProductIds = new Set(products.rows.map((row) => String(row.id)));
    }
    return mappedRows.filter((review) =>
      publicPredicate(review) ||
      normalizeEmail(review.customer_email) === normalizeEmail(user.email) ||
      sellerProductIds.has(String(review.product_id))
    );
  }

  if (isStaff(user)) {
    const permissions = await getActiveStaffPermissions(user);
    const requiredPermission = getRequiredPermissionForEntity(entity, 'read');
    if (requiredPermission && !permissions.includes(requiredPermission)) {
      return [];
    }
    return mappedRows;
  }

  if (entity === 'Order') {
    if (!user) return [];
    const sellerIds = await getSellerIdsForUser(user.id);
    if (!sellerIds.size) {
      return mappedRows.filter((order) => normalizeEmail(order.customer_email) === normalizeEmail(user.email));
    }
    const products = await pool.query(
      "SELECT id FROM entities WHERE entity = 'Product' AND data->>'seller_id' = ANY($1::text[])",
      [[...sellerIds]]
    );
    const sellerProductIds = new Set(products.rows.map((row) => row.id));
    return mappedRows.filter((order) =>
      normalizeEmail(order.customer_email) === normalizeEmail(user.email) ||
      order.items?.some((item) => sellerProductIds.has(String(item.product_id)))
    );
  }
  if (entity === 'Wishlist') {
    if (!user) return [];
    return mappedRows.filter((item) => normalizeEmail(item.created_by) === normalizeEmail(user.email));
  }
  if (entity === 'Seller') {
    const predicate = publicEntityPredicates.Seller;
    if (!user) return mappedRows.filter(predicate);
    return mappedRows.filter((seller) => predicate(seller) || String(seller.user_id) === String(user.id));
  }
  if (entity === 'Product') {
    const predicate = publicEntityPredicates.Product;
    if (!user) return mappedRows.filter(predicate);
    const sellerIds = await getSellerIdsForUser(user.id);
    return mappedRows.filter((product) => predicate(product) || sellerIds.has(String(product.seller_id)));
  }
  if (entity === 'FlashSaleRequest') {
    if (!user) return [];
    const sellerIds = await getSellerIdsForUser(user.id);
    return mappedRows.filter((request) => sellerIds.has(String(request.seller_id)));
  }
  if (entity === 'ProductChat') {
    if (!user) return [];
    const sellerIds = await getSellerIdsForUser(user.id);
    return mappedRows.filter((chat) => normalizeEmail(chat.buyer_email) === normalizeEmail(user.email) || sellerIds.has(String(chat.seller_id)));
  }
  if (entity === 'Review') {
    const predicate = publicEntityPredicates.Review;
    if (!user) return mappedRows.filter(predicate);
    const sellerIds = await getSellerIdsForUser(user.id);
    let sellerProductIds = new Set();
    if (sellerIds.size) {
      const products = await pool.query(
        "SELECT id FROM entities WHERE entity = 'Product' AND data->>'seller_id' = ANY($1::text[])",
        [[...sellerIds]]
      );
      sellerProductIds = new Set(products.rows.map((row) => String(row.id)));
    }
    return mappedRows.filter((review) =>
      predicate(review) ||
      normalizeEmail(review.customer_email) === normalizeEmail(user.email) ||
      sellerProductIds.has(String(review.product_id))
    );
  }
  const predicate = publicEntityPredicates[entity];
  return predicate ? mappedRows.filter(predicate) : [];
};

const getSellerIdsForUser = async (userId) => {
  const result = await pool.query("SELECT id FROM entities WHERE entity = 'Seller' AND data->>'user_id' = $1", [String(userId)]);
  return new Set(result.rows.map((row) => String(row.id)));
};

const getSellerForUser = async (userId, sellerId) => {
  const result = await pool.query(
    "SELECT id, data FROM entities WHERE entity = 'Seller' AND id = $1 AND data->>'user_id' = $2",
    [String(sellerId), String(userId)]
  );
  return result.rows[0] ? mapRow(result.rows[0]) : null;
};

const canManageOrderRecord = async (user, order) => {
  if (!user || !order) return false;
  if (isAdmin(user)) return true;
  if (normalizeEmail(order.customer_email) === normalizeEmail(user.email)) return true;

  if (isStaff(user)) {
    await ensureStaffEntityPermission(user, 'Order', 'update', order);
    return true;
  }

  return false;
};

const userOwnsSeller = async (user, sellerId, requireApproved = true) => {
  if (!user || !sellerId) return false;
  const seller = await getSellerForUser(user.id, sellerId);
  return Boolean(seller && (!requireApproved || seller.status === 'approved'));
};

const getEntityData = async (entity, id) => {
  const result = await pool.query('SELECT id, data, created_date FROM entities WHERE entity = $1 AND id = $2', [entity, id]);
  return result.rowCount ? mapRow(result.rows[0]) : null;
};

const ensureEntityWriteAllowed = async ({ req, entity, id = null, action, payload }) => {
  const user = await getOptionalSessionUser(req);

  if (entity === 'ContactMessage' && action === 'create') {
    return { ...payload, status: 'new' };
  }

  if (!user) {
    const error = new Error('Not authenticated');
    error.status = 401;
    throw error;
  }

  if (isAdmin(user)) return payload;

  if (isStaff(user)) {
    await ensureStaffEntityPermission(user, entity, action, payload);
    return payload;
  }

  if (entity === 'Seller') {
    if (action === 'create') {
      const existing = await pool.query("SELECT id FROM entities WHERE entity = 'Seller' AND data->>'user_id' = $1 LIMIT 1", [String(user.id)]);
      if (existing.rowCount) {
        const error = new Error('Seller application already exists');
        error.status = 409;
        throw error;
      }
      return { ...payload, user_id: user.id, email: user.email, status: 'pending' };
    }
    const existing = await getEntityData(entity, id);
    if (existing && String(existing.user_id) === String(user.id)) {
      const { status, user_id, email, ...safePayload } = payload;
      return safePayload;
    }
  }

  if (entity === 'Product') {
    if (action === 'create') {
      if (!(await userOwnsSeller(user, payload.seller_id))) {
        const error = new Error('Seller account is not approved for this product');
        error.status = 403;
        throw error;
      }
      const seller = await getEntityData('Seller', payload.seller_id);
      return { ...payload, seller_id: seller.id, seller_name: seller.store_name, approval_status: 'pending' };
    }
    const existing = await getEntityData(entity, id);
    if (existing && await userOwnsSeller(user, existing.seller_id)) {
      const { seller_id, seller_name, approval_status, sold_count, average_rating, review_count, ...safePayload } = payload;
      return safePayload;
    }
  }

  if (entity === 'FlashSaleRequest') {
    if (action === 'create' && await userOwnsSeller(user, payload.seller_id)) return { ...payload, status: 'pending' };
    const existing = id ? await getEntityData(entity, id) : null;
    if (existing && await userOwnsSeller(user, existing.seller_id)) return payload;
  }

  if (entity === 'Wishlist') {
    if (action === 'create') return { ...payload, created_by: user.email };
    const existing = await getEntityData(entity, id);
    if (existing && normalizeEmail(existing.created_by) === normalizeEmail(user.email)) return payload;
  }

  if (entity === 'Review') {
    if (action === 'create') return { ...payload, customer_email: user.email, customer_name: user.name || 'Customer', is_approved: false };
    const existing = await getEntityData(entity, id);
    if (existing && normalizeEmail(existing.customer_email) === normalizeEmail(user.email)) {
      const { is_approved, ...safePayload } = payload;
      return safePayload;
    }
  }

  if (entity === 'ProductChat') {
    if (action === 'create') return { ...payload, buyer_email: user.email, buyer_name: user.name || 'Customer' };
    const existing = await getEntityData(entity, id);
    if (existing && (normalizeEmail(existing.buyer_email) === normalizeEmail(user.email) || await userOwnsSeller(user, existing.seller_id))) return payload;
  }

  if (entity === 'Order') {
    if (action === 'create') return { ...payload, customer_email: user.email, is_guest: false };
    const error = new Error('Only admins can update orders');
    error.status = 403;
    throw error;
  }

  const error = new Error('Forbidden');
  error.status = 403;
  throw error;
};

const inventoryReleasedStatuses = new Set(['cancelled', 'refunded']);

const applyInventoryDelta = async (client, items, stockDelta, soldDelta) => {
  const quantities = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    const productId = String(item?.product_id || '');
    const quantity = Number(item?.quantity || 0);
    if (!productId || !Number.isInteger(quantity) || quantity <= 0) {
      const error = new Error('Order contains an invalid product quantity');
      error.status = 400;
      throw error;
    }
    quantities.set(productId, (quantities.get(productId) || 0) + quantity);
  }

  if (quantities.size === 0) {
    const error = new Error('Order must contain at least one product');
    error.status = 400;
    throw error;
  }

  for (const [productId, quantity] of quantities) {
    const result = await client.query(
      "SELECT id, data FROM entities WHERE entity = 'Product' AND id = $1 FOR UPDATE",
      [productId]
    );
    if (!result.rowCount) {
      const error = new Error(`Product not found: ${productId}`);
      error.status = 404;
      throw error;
    }

    const product = result.rows[0].data || {};
    if (product.is_active === false || product.approval_status === 'rejected') {
      const error = new Error(`Product is not available: ${product.name || productId}`);
      error.status = 409;
      throw error;
    }
    const currentStock = Number(product.stock || 0);
    const nextStock = currentStock + stockDelta * quantity;
    if (nextStock < 0) {
      const error = new Error(`Insufficient stock for ${product.name || productId}`);
      error.status = 409;
      throw error;
    }

    const nextSoldCount = Math.max(0, Number(product.sold_count || 0) + soldDelta * quantity);
    await client.query(
      'UPDATE entities SET data = $1, updated_date = NOW() WHERE entity = \'Product\' AND id = $2',
      [{ ...product, stock: nextStock, sold_count: nextSoldCount }, productId]
    );
  }

  return [...quantities.keys()];
};

const createOrderWithInventory = async (payload) => {
  const client = await pool.connect();
  const shouldReserve = !inventoryReleasedStatuses.has(payload.status);
  try {
    await client.query('BEGIN');
    const productIds = shouldReserve ? await applyInventoryDelta(client, payload.items, -1, 1) : [];
    const data = { ...payload, inventory_state: shouldReserve ? 'reserved' : 'released' };
    const id = crypto.randomUUID();
    const result = await client.query(
      'INSERT INTO entities (id, entity, data) VALUES ($1, $2, $3) RETURNING id, data, created_date',
      [id, 'Order', data]
    );
    await client.query('COMMIT');
    productIds.forEach((productId) => invalidateEntityCache('Product', { id: productId }));
    return mapRow(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};

const updateOrderWithInventory = async (req, id, payload) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query("SELECT id, data, created_date FROM entities WHERE entity = 'Order' AND id = $1 FOR UPDATE", [id]);
    if (!existing.rowCount) {
      const error = new Error('Record not found');
      error.status = 404;
      throw error;
    }

    const current = mapRow(existing.rows[0]);
    const { inventory_state: _ignoredInventoryState, ...safePayload } = payload;
    const nextData = { ...existing.rows[0].data, ...safePayload };
    const wasReserved = existing.rows[0].data.inventory_state === 'reserved';
    const willBeReleased = inventoryReleasedStatuses.has(nextData.status);
    const productIds = [];

    if (wasReserved && willBeReleased) {
      productIds.push(...await applyInventoryDelta(client, current.items, 1, -1));
      nextData.inventory_state = 'released';
    } else if (!wasReserved && !willBeReleased && existing.rows[0].data.inventory_state === 'released') {
      productIds.push(...await applyInventoryDelta(client, current.items, -1, 1));
      nextData.inventory_state = 'reserved';
    }

    const result = await client.query(
      "UPDATE entities SET data = $1, updated_date = NOW() WHERE entity = 'Order' AND id = $2 RETURNING id, data, created_date",
      [nextData, id]
    );
    await client.query('COMMIT');
    productIds.forEach((productId) => invalidateEntityCache('Product', { id: productId }));
    return mapRow(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};

const canReadEntityRecord = async (req, entity, record) => {
  const rows = await applyReadableRows(req, entity, [{ id: record.id, data: record, created_date: record.created_date }]);
  return rows.length > 0;
};

app.get('/api/apps/public/prod/public-settings/by-id/:appId', async (req, res) => {
  const appId = req.params.appId;
  const settings = await pool.query("SELECT data FROM entities WHERE entity = 'SiteSettings'");
  const publicSettings = settings.rows.map((row) => row.data);
  res.json({ id: appId, public_settings: publicSettings });
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    res.json(user);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

app.patch('/api/auth/me', async (req, res) => {
  try {
    const user = await getSessionUser(req);
    if (!user) return res.status(401).json({ message: 'Not authenticated' });
    const updates = normalizeUploadUrlsInData(req.body);

    const removedUploadUrls = updates.profile_picture !== undefined && user.profile_picture && updates.profile_picture !== user.profile_picture
      ? [user.profile_picture]
      : [];

    const fields = [];
    const values = [];
    let index = 1;
    for (const key of ['name', 'phone', 'address', 'profile_picture']) {
      if (updates[key] !== undefined) {
        fields.push(`${key} = $${index}`);
        values.push(updates[key]);
        index += 1;
      }
    }
    if (fields.length === 0) {
      return res.json(user);
    }
    values.push(user.id);
    await pool.query(`UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${index}`, values);
    await deleteUploadFilesIfUnused(removedUploadUrls);
    const updated = await pool.query('SELECT id, email, name, phone, address, profile_picture, role, created_at FROM users WHERE id = $1', [user.id]);
    res.json(mapUserRow(updated.rows[0]));
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  res.status(410).json({ message: 'Passwordless login is disabled. Use password login or password reset.' });
});

// Register with email + password
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
    if (String(password).length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
    const normalizedEmail = String(email).trim().toLowerCase();
    const existingResult = await pool.query('SELECT id, password_hash FROM users WHERE email = $1', [normalizedEmail]);
    const hash = await bcrypt.hash(password, 10);

    let user;
    if (existingResult.rowCount) {
      const existingUser = existingResult.rows[0];
      if (existingUser.password_hash !== null && existingUser.password_hash !== undefined) {
        return res.status(409).json({ message: 'User already exists' });
      }
      const update = await pool.query(
        'UPDATE users SET password_hash = $1, name = $2, updated_at = NOW() WHERE id = $3 RETURNING id, email, name, phone, address, profile_picture, role, created_at',
        [hash, name || normalizedEmail.split('@')[0], existingUser.id]
      );
      user = update.rows[0];
    } else {
      const insert = await pool.query(
        'INSERT INTO users(email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, phone, address, profile_picture, role, created_at',
        [normalizedEmail, hash, name || normalizedEmail.split('@')[0]]
      );
      user = insert.rows[0];
    }

    await createSessionForUser(res, user);
    res.status(existingResult.rowCount ? 200 : 201).json(mapUserRow(user));
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

// Login with email + password
app.post('/api/auth/login-password', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
    const normalizedEmail = String(email).trim().toLowerCase();
    if (!checkRateLimit(`login-password:${normalizedEmail}:${getClientKey(req)}`, 10, 15 * 60 * 1000)) {
      return res.status(429).json({ message: 'Too many login attempts. Try again later.' });
    }
    const result = await pool.query('SELECT id, email, password_hash, name, phone, address, profile_picture, role FROM users WHERE email = $1', [normalizedEmail]);
    if (!result.rowCount) return res.status(401).json({ message: 'Invalid credentials' });
    const user = result.rows[0];
    if (!user.password_hash) return res.status(401).json({ message: 'Password login not configured for this account' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
    const adminVerification = await maybeRequireAdminVerification(req, res, user);
    if (adminVerification) {
      return;
    }

    await createSessionForUser(res, user);
    res.json(mapUserRow(user));
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

// Send 2FA code to email (can be used for passwordless or recovery)
app.post('/api/auth/send-2fa', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });
    const normalized = normalizeEmail(email);

    // Rate-limit by email rather than only by client IP so a shared VPS/proxy
    // does not block a single user after a few test requests.
    if (!checkRateLimit(`reset-code:${normalized}`, 5, 15 * 60 * 1000)) {
      return res.status(429).json({ message: 'Too many code requests. Try again later.' });
    }

    const user = await pool.query('SELECT id FROM users WHERE email = $1', [normalized]);
    if (!user.rowCount) {
      return res.status(404).json({ message: 'No account found for this email' });
    }

    const meta = await sendVerificationCode({
      email: normalized,
      purpose: 'password_reset',
      subject: 'Your Open Market BD password reset code',
    });
    res.json({ message: 'Verification code sent', ...meta });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

// Verify 2FA code and create session
app.post('/api/auth/verify-2fa', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ message: 'Email and code required' });
    const normalized = normalizeEmail(email);
    if (!checkRateLimit(`verify-admin:${normalized}:${getClientKey(req)}`, 10, 15 * 60 * 1000)) {
      return res.status(429).json({ message: 'Too many verification attempts. Try again later.' });
    }
    await verifyCode({ email: normalized, code, purpose: 'admin_login' });

    const userRes = await pool.query('SELECT id, email, name, phone, address, profile_picture, role, created_at FROM users WHERE email = $1', [normalized]);
    if (!userRes.rowCount) {
      return res.status(404).json({ message: 'User not found' });
    }
    const user = userRes.rows[0];
    if (!requiresTwoFactorForRole(user.role)) {
      return res.status(403).json({ message: 'Privileged verification is required only for admin or staff accounts' });
    }

    const sessionId = crypto.randomUUID();
    await pool.query('INSERT INTO sessions(id, user_id) VALUES ($1, $2)', [sessionId, user.id]);
    await pool.query("DELETE FROM verification_codes WHERE email = $1 AND purpose = 'admin_login'", [normalized]);

    res.cookie('session_id', sessionId, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    res.json(mapUserRow(user));
  } catch (err) {
    console.error('2FA verification error:', err);
    res.status(err.status || 500).json({ message: err.message || 'Verification failed' });
  }
});

// Debug endpoint removed: use SHOW_VERIFICATION_CODES=true for dev visibility

// Verify a password reset code without creating a session
app.post('/api/auth/verify-reset-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ message: 'Email and code required' });
    const normalized = normalizeEmail(email);
    await verifyCode({ email: normalized, code, purpose: 'password_reset' });
    res.json({ message: 'Code verified' });
  } catch (err) {
    console.error('Password reset code verification error:', err);
    res.status(err.status || 500).json({ message: err.message || 'Verification failed' });
  }
});

// Reset password after code verification
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, password, code } = req.body;
    if (!email || !password || !code) return res.status(400).json({ message: 'Email, password, and code are required' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const normalized = normalizeEmail(email);
    await verifyCode({ email: normalized, code, purpose: 'password_reset' });

    const hash = await bcrypt.hash(String(password), 10);

    // Update user password
    const result = await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2 RETURNING id, email, name, phone, address, profile_picture, role, created_at', [hash, normalized]);
    if (!result.rowCount) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = result.rows[0];

    // Create new session for auto-login
    const sessionId = crypto.randomUUID();
    await pool.query('INSERT INTO sessions(id, user_id) VALUES ($1, $2)', [sessionId, user.id]);

    // Clean up any remaining verification codes
    await pool.query("DELETE FROM verification_codes WHERE email = $1 AND purpose = 'password_reset'", [normalized]);

    // Set cookie
    res.cookie('session_id', sessionId, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });

    console.log('✅ Password reset for:', normalized);
    res.json(mapUserRow(user));
  } catch (err) {
    console.error('Password reset error:', err);
    res.status(err.status || 500).json({ message: err.message || 'Password reset failed' });
  }
});

// Secure admin seed endpoint. Provide SEED_TOKEN in .env and call with that token to create/update admin.
app.post('/api/admin/seed', async (req, res) => {
  try {
    const token = req.body?.token || req.query?.token || req.headers['x-seed-token'];
    if (!process.env.SEED_TOKEN || token !== process.env.SEED_TOKEN) return res.status(403).json({ message: 'Forbidden' });
    const { email, password, role } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
    const normalized = String(email).trim().toLowerCase();
    const hash = await bcrypt.hash(String(password), 10);
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [normalized]);
    if (existing.rowCount) {
      await pool.query('UPDATE users SET password_hash = $1, role = $2, updated_at = NOW() WHERE email = $3', [hash, role || 'admin', normalized]);
      return res.json({ message: 'Admin updated' });
    }
    await pool.query('INSERT INTO users(email, password_hash, name, role) VALUES ($1, $2, $3, $4)', [normalized, hash, normalized.split('@')[0], role || 'admin']);
    res.json({ message: 'Admin created' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/auth/oauth/:provider', (req, res) => {
  const provider = String(req.params.provider).toLowerCase();
  if (provider === 'google') {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ message: 'Google OAuth is not configured' });
    }
    const redirectUri = process.env.GOOGLE_CALLBACK_URL || DEFAULT_GOOGLE_CALLBACK_URL;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account',
    });
    return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  }

  const envKey = `${provider.toUpperCase()}_OAUTH_URL`;
  const url = process.env[envKey] || `REPLACE_WITH_${provider.toUpperCase()}_OAUTH_URL`;
  res.json({ provider, redirect_url: url, note: 'Replace with your OAuth provider redirect URL in .env.local' });
});

app.get('/api/auth/oauth/google/callback', async (req, res) => {
  try {
    const code = String(req.query.code || '').trim();
    if (!code) {
      return res.redirect(`${FRONTEND_URL}/login?error=oauth_cancelled`);
    }

    const callbackUrl = process.env.GOOGLE_CALLBACK_URL || DEFAULT_GOOGLE_CALLBACK_URL;
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: callbackUrl,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok || !tokenData.access_token) {
      return res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);
    }

    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await userInfoResponse.json().catch(() => ({}));
    const normalizedEmail = normalizeEmail(profile.email);
    if (!normalizedEmail) {
      return res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);
    }

    const existingResult = await pool.query('SELECT id, email, password_hash, name, phone, address, profile_picture, role, created_at FROM users WHERE email = $1', [normalizedEmail]);
    let user = existingResult.rowCount ? existingResult.rows[0] : null;
    if (!user) {
      const created = await pool.query(
        'INSERT INTO users(email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, phone, address, profile_picture, role, created_at',
        [normalizedEmail, null, profile.name || profile.given_name || normalizedEmail.split('@')[0]]
      );
      user = created.rows[0];
    } else if (!user.name && profile.name) {
      await pool.query('UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2', [profile.name, user.id]);
      user.name = profile.name;
    }

    const adminVerification = await maybeRequireAdminVerification(req, res, { ...user, role: user.role || 'customer' }, { mode: 'redirect', redirect: '/' });
    if (adminVerification?.pending) {
      return res.redirect(adminVerification.redirectUrl);
    }

    await createSessionForUser(res, user);
    return res.redirect(FRONTEND_URL);
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    const sessionId = req.cookies?.session_id;
    if (sessionId) {
      await pool.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
    }
    res.clearCookie('session_id');
    res.json({ message: 'Logged out' });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

app.get('/api/admin/users', async (req, res) => {
  try {
    const currentUser = await getSessionUser(req);
    if (!currentUser) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    if (isAdmin(currentUser)) {
      // admin can access all users records
    } else if (isStaff(currentUser)) {
      const permissions = await getActiveStaffPermissions(currentUser);
      if (!permissions.includes('users')) {
        return res.status(403).json({ message: 'Permission denied. This account is not allowed to manage users.' });
      }
    } else {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const query = String(req.query.q || '').trim();
    const email = String(req.query.email || '').trim().toLowerCase();
    const id = String(req.query.id || '').trim();
    const whereClauses = [];
    const values = [];

    if (id) {
      whereClauses.push('id = $' + (values.length + 1));
      values.push(id);
    } else if (email) {
      whereClauses.push('LOWER(email) = $' + (values.length + 1));
      values.push(email);
    } else if (query) {
      whereClauses.push('(LOWER(email) LIKE $' + (values.length + 1) + ' OR LOWER(name) LIKE $' + (values.length + 2) + ' OR id = $' + (values.length + 3) + ')');
      values.push(`%${query.toLowerCase()}%`, `%${query.toLowerCase()}%`, query);
    }

    const where = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';
    const result = await pool.query(`SELECT id, email, name, phone, address, profile_picture, role, created_at FROM users ${where} ORDER BY created_at DESC LIMIT 200`, values);
    res.json(result.rows.map(mapUserRow));
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

// Invite user (admin) - create account and optionally send email invite
app.post('/api/admin/invite', async (req, res) => {
  try {
    const currentUser = await getSessionUser(req);
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const { email, role } = req.body || {};
    if (!email) return res.status(400).json({ message: 'Email required' });
    const normalized = String(email).trim().toLowerCase();

    // create or update user record without password (admin will manage)
    const existing = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1', [normalized]);
    if (existing.rowCount) {
      await pool.query('UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2', [role || 'employee', existing.rows[0].id]);
    } else {
      await pool.query('INSERT INTO users(email, name, role) VALUES ($1, $2, $3)', [normalized, normalized.split('@')[0], role || 'employee']);
    }

    let sent = false;
    let info = null;
    if (transporter) {
      try {
        info = await transporter.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to: normalized, subject: 'You have been invited', text: `You have been invited as ${role || 'employee'} on Open Market BD. Please contact admin to set your password or use password reset on login.` });
        sent = true;
      } catch (err) {
        // continue but report not sent
        sent = false;
        info = { error: err.message };
      }
    }

    res.json({ ok: true, sent, info });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/entities/:entity/filter', async (req, res) => {
  try {
    const entity = req.params.entity;
    assertEntityName(entity);
    const { query = {}, order, limit, offset } = req.body;
    const conditions = ['entity = $1'];
    const values = [entity];
    let idx = 2;
    for (const [key, value] of Object.entries(query)) {
      if (key === 'id') {
        conditions.push(`id = $${idx}`);
      } else if (key === 'created_date' || key === 'updated_date') {
        conditions.push(`${key} = $${idx}`);
      } else {
        assertEntityName(key);
        conditions.push(`data->>'${key}' = $${idx}`);
      }
      values.push(String(value));
      idx += 1;
    }
    const orderClause = parseOrder(order);
    const parsedLimit = Number(limit);
    const parsedOffset = Number(offset);
    const limitClause = Number.isInteger(parsedLimit) && parsedLimit > 0 ? `LIMIT ${Math.min(parsedLimit, 100)}` : '';
    const offsetClause = Number.isInteger(parsedOffset) && parsedOffset > 0 ? `OFFSET ${parsedOffset}` : '';
    const result = await pool.query(`SELECT id, data, created_date FROM entities WHERE ${conditions.join(' AND ')} ORDER BY ${orderClause} ${limitClause} ${offsetClause}`, values);
    const readable = await applyReadableRows(req, entity, result.rows);
    res.json(readable);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

app.get('/api/entities/:entity/list', async (req, res) => {
  try {
    const entity = req.params.entity;
    assertEntityName(entity);
    const order = req.query.order;
    const limit = req.query.limit ? Number(req.query.limit) : null;
    const orderClause = parseOrder(order);
    const limitClause = limit ? `LIMIT ${limit}` : '';
    const result = await pool.query(`SELECT id, data, created_date FROM entities WHERE entity = $1 ORDER BY ${orderClause} ${limitClause}`, [entity]);
    const readable = await applyReadableRows(req, entity, result.rows);
    res.json(readable);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

app.post('/api/entities/:entity', async (req, res) => {
  try {
    const entity = req.params.entity;
    assertEntityName(entity);
    const payload = await ensureEntityWriteAllowed({
      req,
      entity,
      action: 'create',
      payload: normalizeUploadUrlsInData(req.body),
    });
    if (entity === 'Order') {
      const record = await createOrderWithInventory(payload);
      return res.status(201).json(record);
    }

    const id = crypto.randomUUID();
    const result = await pool.query(
      'INSERT INTO entities (id, entity, data) VALUES ($1, $2, $3) RETURNING id, data, created_date',
      [id, entity, payload]
    );
    const record = mapRow(result.rows[0]);
    invalidateEntityCache(entity, record);
    res.status(201).json(record);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

app.post('/api/guest-order', async (req, res) => {
  try {
    const payload = req.body;
    const orderNumber = payload.order_number || ("OMB-" + Date.now());
    const record = await createOrderWithInventory({
      ...payload,
      order_number: orderNumber,
      is_guest: true,
    });
    res.status(201).json(record);
  } catch (error) {
    res.status(error.status || 500).json({
      message: error.message
    });
  }
});

app.post('/api/guest-order/track', async (req, res) => {
  try {
    const orderNumber = String(req.body?.order_number || '').trim().toUpperCase();
    const phone = String(req.body?.phone || '').trim();
    if (!orderNumber || !phone) {
      return res.status(400).json({ message: 'Order number and phone number are required' });
    }
    if (!checkRateLimit(`guest-track:${orderNumber}:${getClientKey(req)}`, 10, 15 * 60 * 1000)) {
      return res.status(429).json({ message: 'Too many tracking attempts. Try again later.' });
    }
    const result = await pool.query(
      "SELECT id, data, created_date FROM entities WHERE entity = 'Order' AND data->>'order_number' = $1 AND data->>'customer_phone' = $2 LIMIT 1",
      [orderNumber, phone]
    );
    if (!result.rowCount) {
      return res.status(404).json({ message: 'Order not found or phone number does not match' });
    }
    const record = mapRow(result.rows[0]);
    invalidateEntityCache(entity, { ...record, ...nextData });
    res.json(record);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

app.get('/api/entities/:entity/:id', async (req, res) => {
  try {
    const entity = req.params.entity;
    assertEntityName(entity);
    const id = req.params.id;
    const result = await pool.query('SELECT id, data, created_date FROM entities WHERE entity = $1 AND id = $2', [entity, id]);
    if (!result.rowCount) {
      return res.status(404).json({ message: 'Record not found' });
    }
    const record = mapRow(result.rows[0]);
    if (!(await canReadEntityRecord(req, entity, record))) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    res.json(record);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

app.patch('/api/entities/:entity/:id', requireAuth, async (req, res) => {
  try {
    const entity = req.params.entity;
    assertEntityName(entity);
    const id = req.params.id;
    const payload = await ensureEntityWriteAllowed({
      req,
      entity,
      id,
      action: 'update',
      payload: normalizeUploadUrlsInData(req.body),
    });
    if (entity === 'Order') {
      const record = await updateOrderWithInventory(req, id, payload);
      return res.json(record);
    }

    const existing = await pool.query('SELECT data FROM entities WHERE entity = $1 AND id = $2', [entity, id]);
    if (!existing.rowCount) {
      return res.status(404).json({ message: 'Record not found' });
    }
    const nextData = { ...existing.rows[0].data, ...payload };
    const removedUploadUrls = getRemovedUploadUrls(existing.rows[0].data, nextData);

    const result = await pool.query(
      'UPDATE entities SET data = data || $1, updated_date = NOW() WHERE entity = $2 AND id = $3 RETURNING id, data, created_date',
      [payload, entity, id]
    );
    await deleteUploadFilesIfUnused(removedUploadUrls);
    res.json(mapRow(result.rows[0]));
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

app.delete('/api/entities/:entity/:id', requireAuth, async (req, res) => {
  try {
    const entity = req.params.entity;
    assertEntityName(entity);
    const id = req.params.id;
    const result = await pool.query('SELECT data FROM entities WHERE entity = $1 AND id = $2', [entity, id]);
    if (!result.rowCount) {
      return res.status(404).json({ message: 'Record not found' });
    }
    await ensureEntityWriteAllowed({
      req,
      entity,
      id,
      action: 'delete',
      payload: {},
    });
    const removedUploadUrls = extractUploadUrls(result.rows[0].data);
    await pool.query('DELETE FROM entities WHERE entity = $1 AND id = $2', [entity, id]);
    await deleteUploadFilesIfUnused(removedUploadUrls);
    invalidateEntityCache(entity, { id, ...result.rows[0].data });
    res.json({ success: true });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

app.delete('/api/files', requireAuth, async (req, res) => {
  try {
    const fileUrl = req.body?.file_url;
    if (!fileUrl) {
      return res.status(400).json({ message: 'file_url is required' });
    }
    const deleted = await deleteUploadFileIfUnused(fileUrl);
    res.json({ success: true, deleted });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const uploadMiddleware = multer({ storage: multer.memoryStorage() });
const getMaxUploadBytes = async () => {
  const result = await pool.query("SELECT data->>'value' AS value FROM entities WHERE entity = 'SiteSettings' AND data->>'key' = 'max_image_size_mb' LIMIT 1");
  const maxMb = result.rowCount ? parseFloat(result.rows[0].value) : 2;
  return Number.isFinite(maxMb) && maxMb > 0 ? Math.round(maxMb * 1024 * 1024) : 2 * 1024 * 1024;
};

app.post('/api/files/upload', requireAuth, uploadMiddleware.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const maxBytes = await getMaxUploadBytes();
    if (req.file.size > maxBytes) {
      return res.status(413).json({ message: `File size exceeds the maximum allowed size of ${Math.round(maxBytes / 1024 / 1024)} MB.` });
    }
    const id = crypto.randomUUID();
    const extension = path.extname(req.file.originalname) || '.bin';
    const fileName = `${id}${extension}`;
    const filePath = path.join(uploadDir, fileName);
    await fs.promises.writeFile(filePath, req.file.buffer);
    const url = `/api/uploads/${fileName}`;
    res.json({ file_url: url });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/functions/:name', async (req, res) => {
  const name = req.params.name;
  if (name === 'sendSecurityAlert') {
    const { userEmail, userName, attemptedPermission, pathname } = req.body || {};
    logSecurityAlert({
      userEmail,
      userName,
      attemptedPermission,
      pathname,
      reason: 'blocked_staff_navigation',
    });
    return res.json({ message: 'Security alert sent locally' });
  }
  res.status(404).json({ message: `Function ${name} is not implemented` });
});

app.post('/api/llm/invoke', async (req, res) => {
  res.json({ text: 'Local AI integration not configured. This is a placeholder response.' });
});

// ===== WISHLIST ENDPOINTS =====

// Get user's wishlist
app.get('/api/wishlist', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT product_id FROM wishlist WHERE user_id = $1 ORDER BY added_at DESC', [req.user.id]);
    res.json({ items: result.rows.map(r => r.product_id) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add to wishlist
app.post('/api/wishlist', requireAuth, async (req, res) => {
  try {
    const { product_id } = req.body;
    if (!product_id) return res.status(400).json({ message: 'product_id required' });
    
    await pool.query(
      'INSERT INTO wishlist(user_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user.id, product_id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Remove from wishlist
app.delete('/api/wishlist/:product_id', requireAuth, async (req, res) => {
  try {
    const { product_id } = req.params;
    await pool.query('DELETE FROM wishlist WHERE user_id = $1 AND product_id = $2', [req.user.id, product_id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Sync guest wishlist to user account (called after login/register)
app.post('/api/wishlist/sync', requireAuth, async (req, res) => {
  try {
    const { guest_items } = req.body;
    if (!Array.isArray(guest_items) || guest_items.length === 0) {
      return res.json({ success: true, synced: 0 });
    }
    
    // Insert items, ignoring duplicates
    let synced = 0;
    for (const product_id of guest_items) {
      const result = await pool.query(
        'INSERT INTO wishlist(user_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [req.user.id, product_id]
      );
      if (result.rowCount > 0) synced++;
    }
    
    res.json({ success: true, synced });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ===== ORDER PAYMENT ENDPOINTS =====

// Verify payment and confirm order
app.post('/api/orders/:orderId/verify-payment', requireAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { transaction_id } = req.body;

    if (!transaction_id) {
      return res.status(400).json({ message: 'transaction_id required' });
    }

    const orderResult = await pool.query(
      'SELECT id, data, created_date FROM entities WHERE entity = $1 AND id = $2',
      ['Order', orderId]
    );

    if (!orderResult.rowCount) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const order = mapRow(orderResult.rows[0]);
    if (!(await canReadEntityRecord(req, 'Order', order))) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const canManage = await canManageOrderRecord(req.user, order);
    if (!canManage) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await pool.query(
      'UPDATE entities SET data = data || $1, updated_date = NOW() WHERE entity = $2 AND id = $3',
      [
        {
          status: 'payment_confirmed',
          transaction_id,
          payment_verified_at: new Date().toISOString(),
        },
        'Order',
        orderId,
      ]
    );

    res.json({ success: true, message: 'Payment verified and order confirmed' });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

// Get order details (for users to view their orders)
app.get('/api/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const result = await pool.query(
      'SELECT id, data, created_date FROM entities WHERE entity = $1 AND id = $2',
      ['Order', orderId]
    );
    
    if (!result.rowCount) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    const order = mapRow(result.rows[0]);
    if (!(await canReadEntityRecord(req, 'Order', order))) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    res.json(order);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
});

export async function startApiServer() {
  await initAppDatabase(pool);
  return app;
}

export { app };
