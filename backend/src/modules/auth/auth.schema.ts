import { z } from "zod";
import {
  PRIVACY_VERSION,
  TERMS_VERSION,
} from "../../shared/legal/legal-versions.js";

const legalAcceptanceSchema = {
  aceptaTerminos: z.literal(true, {
    error: "Debes aceptar los Términos y Condiciones.",
  }),
  versionTerminos: z.literal(TERMS_VERSION, {
    error: "La versión de los Términos y Condiciones no es válida.",
  }),
  aceptaPrivacidad: z.literal(true, {
    error: "Debes aceptar la Política de Privacidad.",
  }),
  versionPrivacidad: z.literal(PRIVACY_VERSION, {
    error: "La versión de la Política de Privacidad no es válida.",
  }),
};

export const acceptLegalSchema = z.object(legalAcceptanceSchema);
export type AcceptLegalInput = z.infer<typeof acceptLegalSchema>;

export const loginSchema = z.object({
  correo: z
    .string()
    .trim()
    .toLowerCase()
    .email("El correo electrónico no es válido."),

  password: z
    .string()
    .min(1, "La contraseña es obligatoria.")
    .max(200, "La contraseña no es válida."),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    nombres: z
      .string()
      .trim()
      .min(2, "Los nombres deben tener al menos 2 caracteres.")
      .max(120, "Los nombres son demasiado largos."),

    apellidos: z
      .string()
      .trim()
      .min(2, "Los apellidos deben tener al menos 2 caracteres.")
      .max(150, "Los apellidos son demasiado largos."),

    telefono: z
      .string()
      .trim()
      .min(7, "El teléfono no es válido.")
      .max(30, "El teléfono no es válido.")
      .optional()
      .or(z.literal("")),

    correo: z
      .string()
      .trim()
      .toLowerCase()
      .email("El correo electrónico no es válido."),

    password: z
      .string()
      .min(10, "La contraseña debe tener al menos 10 caracteres.")
      .max(200, "La contraseña es demasiado larga.")
      .regex(
        /[a-z]/,
        "La contraseña debe contener una letra minúscula.",
      )
      .regex(
        /[A-Z]/,
        "La contraseña debe contener una letra mayúscula.",
      )
      .regex(
        /\d/,
        "La contraseña debe contener un número.",
      ),

    confirmarPassword: z.string(),

    ...legalAcceptanceSchema,
  })
  .refine(
    (data) => data.password === data.confirmarPassword,
    {
      message: "Las contraseñas no coinciden.",
      path: ["confirmarPassword"],
    },
  );

export type RegisterInput = z.infer<
  typeof registerSchema
>;

export const confirmEmailSchema = z.object({
  token: z
    .string()
    .trim()
    .min(20, "El token de verificación no es válido.")
    .max(500, "El token de verificación no es válido."),
});

export const forgotPasswordSchema = z.object({
  correo: z
    .string()
    .trim()
    .toLowerCase()
    .email("El correo electrónico no es válido."),
});

export const resetPasswordSchema = z
  .object({
    token: z
      .string()
      .trim()
      .min(20, "El token de recuperación no es válido.")
      .max(500, "El token de recuperación no es válido."),

    password: z
      .string()
      .min(10, "La contraseña debe tener al menos 10 caracteres.")
      .max(200, "La contraseña es demasiado larga.")
      .regex(
        /[a-z]/,
        "La contraseña debe contener una letra minúscula.",
      )
      .regex(
        /[A-Z]/,
        "La contraseña debe contener una letra mayúscula.",
      )
      .regex(
        /\d/,
        "La contraseña debe contener un número.",
      ),

    confirmarPassword: z.string(),
  })
  .refine(
    (data) => data.password === data.confirmarPassword,
    {
      message: "Las contraseñas no coinciden.",
      path: ["confirmarPassword"],
    },
  );

export type ConfirmEmailInput = z.infer<
  typeof confirmEmailSchema
>;

export type ForgotPasswordInput = z.infer<
  typeof forgotPasswordSchema
>;

export type ResetPasswordInput = z.infer<
  typeof resetPasswordSchema
>;

export const googleLoginSchema = z.object({
  credential: z
    .string()
    .trim()
    .min(100, "La credencial de Google no es válida.")
    .max(5000, "La credencial de Google no es válida."),
  aceptaTerminos: z.boolean().optional(),
  versionTerminos: z.string().max(30).optional(),
  aceptaPrivacidad: z.boolean().optional(),
  versionPrivacidad: z.string().max(30).optional(),
});

export type GoogleLoginInput = z.infer<
  typeof googleLoginSchema
>;
