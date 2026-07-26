import { env } from "../../config/env.js";
import { sendMail } from "../../lib/mailer.js";

interface VerificationEmailInput {
  correo: string;
  nombre: string;
  token: string;
}

interface PasswordResetEmailInput {
  correo: string;
  nombre: string;
  token: string;
}

export async function sendVerificationEmail(
  input: VerificationEmailInput,
): Promise<void> {
  const url =
    `${env.FRONTEND_URL}/verificar-correo` +
    `?token=${encodeURIComponent(input.token)}`;

  await sendMail({
    to: input.correo,
    subject: "Verifica tu correo electrónico",
    text: [
      `Hola ${input.nombre}.`,
      "",
      "Verifica tu correo ingresando al siguiente enlace:",
      url,
      "",
      "El enlace tiene una vigencia limitada.",
    ].join("\n"),
    html: `
      <h2>Verificación de correo</h2>
      <p>Hola ${input.nombre}.</p>
      <p>Confirma tu correo haciendo clic en el siguiente enlace:</p>
      <p>
        <a href="${url}">
          Verificar mi correo
        </a>
      </p>
      <p>El enlace tiene una vigencia limitada.</p>
    `,
  });
}

export async function sendPasswordResetEmail(
  input: PasswordResetEmailInput,
): Promise<void> {
  const url =
    `${env.FRONTEND_URL}/restablecer-password` +
    `?token=${encodeURIComponent(input.token)}`;

  await sendMail({
    to: input.correo,
    subject: "Recuperación de contraseña",
    text: [
      `Hola ${input.nombre}.`,
      "",
      "Puedes establecer una nueva contraseña aquí:",
      url,
      "",
      "Si no solicitaste este cambio, ignora este mensaje.",
    ].join("\n"),
    html: `
      <h2>Recuperación de contraseña</h2>
      <p>Hola ${input.nombre}.</p>
      <p>Establece una nueva contraseña usando este enlace:</p>
      <p>
        <a href="${url}">
          Restablecer mi contraseña
        </a>
      </p>
      <p>
        Si no solicitaste este cambio, ignora este mensaje.
      </p>
    `,
  });
}