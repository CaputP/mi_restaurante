import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { AppError } from "../../shared/errors/app-error.js";
import {
  loginSchema,
  registerSchema,
} from "./auth.schema.js";

import {
  getCurrentUser,
  login,
  register,
} from "./auth.service.js";

import {
  confirmEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./auth.schema.js";

import {
  confirmEmailVerification,
  requestPasswordReset,
  resetPasswordWithToken,
  sendEmailVerificationForUser,
} from "./auth-security.service.js";

import {
  googleLoginSchema,
} from "./auth.schema.js";

import {
  loginWithGoogle,
} from "./google-auth.service.js";

export async function loginController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = loginSchema.parse(request.body);
    const resultado = await login(input);

    response.status(200).json({
      success: true,
      message: "Inicio de sesión correcto.",
      data: resultado,
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function registerController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = registerSchema.parse(
      request.body,
    );

    const resultado = await register(input);

    response.status(201).json({
      success: true,
      message:
        "La cuenta del cliente fue creada correctamente.",
      data: resultado,
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function meController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError(
        401,
        "No existe una sesión válida.",
        "TOKEN_REQUERIDO",
      );
    }

    const usuario = await getCurrentUser(
      request.auth.usuarioId,
    );

    response.status(200).json({
      success: true,
      message: "Sesión válida.",
      data: {
        usuario,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function requestEmailVerificationController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError(
        401,
        "No existe una sesión válida.",
        "TOKEN_REQUERIDO",
      );
    }

    const result =
      await sendEmailVerificationForUser(
        request.auth.usuarioId,
      );

    response.status(200).json({
      success: true,
      message: result.alreadyVerified
        ? "El correo ya se encuentra verificado."
        : "Se envió un nuevo enlace de verificación.",
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function confirmEmailController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = confirmEmailSchema.parse(
      request.body,
    );

    await confirmEmailVerification(input.token);

    response.status(200).json({
      success: true,
      message:
        "El correo electrónico fue verificado correctamente.",
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function forgotPasswordController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = forgotPasswordSchema.parse(
      request.body,
    );

    await requestPasswordReset(input);

    response.status(200).json({
      success: true,
      message:
        "Si el correo está registrado, recibirás un enlace de recuperación.",
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function resetPasswordController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = resetPasswordSchema.parse(
      request.body,
    );

    await resetPasswordWithToken(input);

    response.status(200).json({
      success: true,
      message:
        "La contraseña fue restablecida correctamente. Inicia sesión nuevamente.",
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function googleLoginController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = googleLoginSchema.parse(
      request.body,
    );

    const resultado =
      await loginWithGoogle(input);

    response.status(200).json({
      success: true,
      message:
        "Inicio de sesión con Google correcto.",
      data: resultado,
    });
  } catch (error: unknown) {
    next(error);
  }
}