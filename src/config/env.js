import 'dotenv/config';

const required = ['DATABASE_URL', 'MONGODB_URI', 'JWT_SECRET'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

// Anyone who knows the JWT secret can mint an ADMIN token, so refuse to start
// with a short secret or the public placeholder from .env.example.
const PLACEHOLDER_SECRET = 'change-me-to-a-long-random-string';
const MIN_SECRET_LENGTH = 32;
if (process.env.JWT_SECRET === PLACEHOLDER_SECRET || process.env.JWT_SECRET.length < MIN_SECRET_LENGTH) {
  throw new Error(
    `JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters and not the example value. ` +
      `Generate one with: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
  );
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,
  mongodbUri: process.env.MONGODB_URI,
  mongodbDbName: process.env.MONGODB_DB_NAME || 'campus_delivery_matrix',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
};

export default env;
