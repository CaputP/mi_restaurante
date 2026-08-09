import pino from "pino";

import {
  env,
} from "../config/env.js";

export const logger = pino({
  level:
    env.LOG_LEVEL,

  base: {
    service:
      "el-vallecito-api",

    environment:
      env.NODE_ENV,
  },

  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "request.headers.authorization",
      "request.headers.cookie",
      "password",
      "passwordHash",
      "token",
      "credential",
      "SMTP_PASSWORD",
      "DATABASE_URL",
      "JWT_SECRET",
    ],

    censor:
      "[REDACTED]",
  },
});
