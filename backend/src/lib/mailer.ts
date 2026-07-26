import nodemailer, {
  type Transporter,
} from "nodemailer";

import { env } from "../config/env.js";

interface SendMailInput {
  to: string;
  subject: string;
  text: string;
  html: string;
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) {
    return transporter;
  }

  if (
    !env.SMTP_HOST ||
    !env.SMTP_PORT ||
    !env.SMTP_USER ||
    !env.SMTP_PASSWORD
  ) {
    throw new Error(
      "La configuración SMTP está incompleta.",
    );
  }

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD,
    },
  });

  return transporter;
}

export async function sendMail(
  input: SendMailInput,
): Promise<void> {
  if (env.EMAIL_MODE === "console") {
    console.log("\n================ CORREO ================");
    console.log(`Para: ${input.to}`);
    console.log(`Asunto: ${input.subject}`);
    console.log(input.text);
    console.log("========================================\n");

    return;
  }

  await getTransporter().sendMail({
    from: env.MAIL_FROM,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
}