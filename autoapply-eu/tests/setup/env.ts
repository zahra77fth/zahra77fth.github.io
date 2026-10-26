import path from "node:path";

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || "postgresql://autoapply:autoapply@localhost:5432/autoapply_test";
process.env.REDIS_URL = process.env.TEST_REDIS_URL || "redis://localhost:6379/15";
process.env.ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
process.env.SESSION_SECRET = "test-session-secret-0123456789";
process.env.STORAGE_DIR = path.resolve(__dirname, "../.tmp/storage");
process.env.EMAIL_TRANSPORT = "json";
process.env.LLM_API_KEY = "";
process.env.LOG_LEVEL = "silent";
