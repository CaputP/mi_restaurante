import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce
    .number()
    .int()
    .positive()
    .default(3000),

  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL es obligatoria."),

  FRONTEND_URL: z
    .string()
    .url("FRONTEND_URL debe ser una URL válida.")
    .default("http://localhost:5173"),

  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET debe tener al menos 32 caracteres."),

  JWT_EXPIRES_IN_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(28_800),

  AUTH_COOKIE_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),

  AUTH_COOKIE_SAME_SITE: z
    .enum(["strict", "lax", "none"])
    .default("lax"),

  TRUST_PROXY_HOPS: z.coerce
    .number()
    .int()
    .min(0)
    .max(10)
    .default(0),

  LOG_LEVEL: z
    .enum([
      "fatal",
      "error",
      "warn",
      "info",
      "debug",
      "trace",
      "silent",
    ])
    .default("info"),

  RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(900_000),

  API_RATE_LIMIT_MAX: z.coerce
    .number()
    .int()
    .positive()
    .default(1_000),

  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(900_000),

  AUTH_RATE_LIMIT_MAX: z.coerce
    .number()
    .int()
    .positive()
    .default(10),

  SERVER_REQUEST_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(30_000),

  SERVER_HEADERS_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(15_000),

  SERVER_KEEP_ALIVE_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(5_000),

  EMAIL_MODE: z
    .enum(["console", "smtp"])
    .default("console"),

  MAIL_FROM: z
    .string()
    .min(1)
    .default(
      "El Vallecito de Chocco <no-reply@elvallecito.local>",
    ),

  EMAIL_VERIFICATION_TTL_MINUTES: z.coerce
    .number()
    .int()
    .positive()
    .default(1440),

  PASSWORD_RESET_TTL_MINUTES: z.coerce
    .number()
    .int()
    .positive()
    .default(30),

  RESERVATION_CLIENT_CANCELLATION_HOURS: z.coerce
    .number()
    .int()
    .min(0)
    .max(720)
    .default(1),

  LEGAL_CONTACT_EMAIL: z
    .string()
    .trim()
    .email("LEGAL_CONTACT_EMAIL debe ser un correo válido.")
    .default("elvallecitodechocco@gmail.com"),

  CONSUMER_CLAIMS_NOTIFICATION_EMAIL: z
    .string()
    .trim()
    .email("CONSUMER_CLAIMS_NOTIFICATION_EMAIL debe ser un correo válido.")
    .default("elvallecitodechocco@gmail.com"),

  BACKUP_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),

  BACKUP_DIRECTORY: z
    .string()
    .min(1)
    .default("./backups"),

  BACKUP_INTERVAL_HOURS: z.coerce
    .number()
    .int()
    .min(1)
    .max(168)
    .default(24),

  BACKUP_RETENTION_DAYS: z.coerce
    .number()
    .int()
    .min(1)
    .max(3650)
    .default(30),

  PG_DUMP_PATH: z
    .string()
    .min(1)
    .default("pg_dump"),

  SMTP_HOST: z.string().optional(),

  SMTP_PORT: z.coerce
    .number()
    .int()
    .positive()
    .optional(),

  SMTP_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),

  SMTP_USER: z.string().optional(),

  SMTP_PASSWORD: z.string().optional(),

  GOOGLE_CLIENT_ID: z
    .string()
    .min(
      20,
      "GOOGLE_CLIENT_ID no se encuentra configurado.",
    ),
}).superRefine((configuration, context) => {
  if (
    configuration.NODE_ENV ===
      "production" &&
    configuration.JWT_SECRET.length < 48
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,
      path: [
        "JWT_SECRET",
      ],
      message:
        "JWT_SECRET debe tener al menos 48 caracteres en producción.",
    });
  }

  if (
    configuration.NODE_ENV === "production" &&
    !configuration.AUTH_COOKIE_SECURE
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["AUTH_COOKIE_SECURE"],
      message:
        "AUTH_COOKIE_SECURE debe ser true en producción.",
    });
  }

  if (
    configuration.AUTH_COOKIE_SAME_SITE === "none" &&
    !configuration.AUTH_COOKIE_SECURE
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["AUTH_COOKIE_SAME_SITE"],
      message:
        "SameSite=None requiere AUTH_COOKIE_SECURE=true.",
    });
  }

  if (
    configuration.NODE_ENV ===
      "production" &&
    configuration.EMAIL_MODE !==
      "smtp"
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,
      path: [
        "EMAIL_MODE",
      ],
      message:
        "EMAIL_MODE debe ser smtp en producción.",
    });
  }

  if (
    configuration.NODE_ENV === "production" &&
    !configuration.BACKUP_ENABLED
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["BACKUP_ENABLED"],
      message:
        "BACKUP_ENABLED debe ser true en producción.",
    });
  }

  if (
    configuration.EMAIL_MODE ===
      "smtp"
  ) {
    const requiredSmtpValues = [
      [
        "SMTP_HOST",
        configuration.SMTP_HOST,
      ],
      [
        "SMTP_PORT",
        configuration.SMTP_PORT,
      ],
      [
        "SMTP_USER",
        configuration.SMTP_USER,
      ],
      [
        "SMTP_PASSWORD",
        configuration.SMTP_PASSWORD,
      ],
    ] as const;

    for (
      const [key, value]
      of requiredSmtpValues
    ) {
      if (!value) {
        context.addIssue({
          code:
            z.ZodIssueCode.custom,
          path: [
            key,
          ],
          message:
            `${key} es obligatorio cuando EMAIL_MODE es smtp.`,
        });
      }
    }
  }

  if (
    configuration.NODE_ENV ===
      "production" &&
    configuration.FRONTEND_URL.includes(
      "localhost",
    )
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,
      path: [
        "FRONTEND_URL",
      ],
      message:
        "FRONTEND_URL no puede apuntar a localhost en producción.",
    });
  }

  if (
    configuration.SERVER_HEADERS_TIMEOUT_MS <=
    configuration.SERVER_KEEP_ALIVE_TIMEOUT_MS
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,
      path: [
        "SERVER_HEADERS_TIMEOUT_MS",
      ],
      message:
        "SERVER_HEADERS_TIMEOUT_MS debe superar SERVER_KEEP_ALIVE_TIMEOUT_MS.",
    });
  }

  if (
    configuration.SERVER_HEADERS_TIMEOUT_MS >=
    configuration.SERVER_REQUEST_TIMEOUT_MS
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,
      path: [
        "SERVER_HEADERS_TIMEOUT_MS",
      ],
      message:
        "SERVER_HEADERS_TIMEOUT_MS debe ser menor que SERVER_REQUEST_TIMEOUT_MS.",
    });
  }
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("Variables de entorno inválidas:");

  for (const issue of result.error.issues) {
    console.error(`- ${issue.path.join(".")}: ${issue.message}`);
  }

  throw new Error(
    "No se pudo iniciar el servidor por una configuración inválida.",
  );
}

export const env = result.data;
