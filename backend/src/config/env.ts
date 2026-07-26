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