import type {
  NextFunction,
  Request,
  Response,
} from "express";
import {
  AppError,
} from "../../shared/errors/app-error.js";
import {
  adminReviewListQuerySchema,
  clientSaleReviewQuerySchema,
  createReviewSchema,
  moderateReviewSchema,
  publicReviewQuerySchema,
  reviewIdParamSchema,
} from "./review.schema.js";
import {
  createVerifiedReview,
  listAdminReviews,
  listClientReviewableSales,
  listPublicReviews,
  moderateReview,
} from "./review.service.js";

function getAuth(
  request: Request,
) {
  if (!request.auth) {
    throw new AppError(
      401,
      "Debes iniciar sesión.",
      "TOKEN_REQUERIDO",
    );
  }

  return {
    usuarioId:
      request.auth.usuarioId,
    rol:
      request.auth.rol,
  };
}

export async function listPublicReviewsController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data =
      await listPublicReviews(
        publicReviewQuerySchema.parse(
          request.query,
        ),
      );
    response.status(200).json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function listClientSalesForReviewController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data =
      await listClientReviewableSales(
        getAuth(request),
        clientSaleReviewQuerySchema.parse(
          request.query,
        ),
      );
    response.status(200).json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function createReviewController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const review =
      await createVerifiedReview(
        getAuth(request),
        createReviewSchema.parse(
          request.body,
        ),
      );
    response.status(201).json({
      success: true,
      message:
        "Gracias por tu opinión. La revisaremos antes de publicarla.",
      data: {
        resena:
          review,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function listAdminReviewsController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data =
      await listAdminReviews(
        getAuth(request),
        adminReviewListQuerySchema.parse(
          request.query,
        ),
      );
    response.status(200).json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function moderateReviewController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } =
      reviewIdParamSchema.parse(
        request.params,
      );
    const review =
      await moderateReview(
        getAuth(request),
        id,
        moderateReviewSchema.parse(
          request.body,
        ),
      );
    response.status(200).json({
      success: true,
      message:
        "La moderación de la reseña fue actualizada.",
      data: {
        resena:
          review,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}
