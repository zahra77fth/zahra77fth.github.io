import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  redact: {
    paths: [
      "password",
      "*.password",
      "apiKey",
      "*.apiKey",
      "token",
      "*.token",
      "email",
      "*.email",
      "phone",
      "*.phone",
      "profile",
      "*.profile",
      "headers.authorization",
      "*.headers.authorization",
    ],
    censor: "[redacted]",
  },
  base: { service: "autoapply-eu" },
});
