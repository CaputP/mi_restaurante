import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { prisma } from "../lib/prisma.js";

import {
  createAuditDescription,
  getAuditAction,
  getAuditPathInformation,
  isUuid,
  sanitizeAuditData,
} from "../shared/audit/audit.utils.js";

const MUTATION_METHODS =
  new Set([
    "POST",
    "PATCH",
    "PUT",
    "DELETE",
  ]);

const EXCLUDED_MODULES =
  new Set([
    "auth",
    "audit",
    "reports",
  ]);

function getCandidateBranchId(
  request: Request,
): string | null {
  const body =
    request.body &&
    typeof request.body ===
      "object"
      ? request.body as Record<
          string,
          unknown
        >
      : {};

  const query =
    request.query as Record<
      string,
      unknown
    >;

  const candidates = [
    body.sucursalId,
    body.branchId,
    query.sucursalId,
    request.params
      ?.sucursalId,
  ];

  for (
    const candidate
    of candidates
  ) {
    if (isUuid(candidate)) {
      return candidate;
    }
  }

  return null;
}

async function resolveBranchId(
  request: Request,
  moduleName: string,
  entityId: string | null,
): Promise<string | null> {
  const candidate =
    getCandidateBranchId(
      request,
    );

  if (candidate) {
    return candidate;
  }

  if (
    moduleName ===
      "SUCURSALES" &&
    entityId
  ) {
    return entityId;
  }

  const auth =
    request.auth;

  if (
    !auth ||
    auth.rol ===
      "ADMINISTRADOR_GENERAL"
  ) {
    return null;
  }

  const assignment =
    await prisma
      .usuarioSucursal
      .findFirst({
        where: {
          usuarioId:
            auth.usuarioId,

          activo: true,

          OR: [
            {
              fechaFin: null,
            },
            {
              fechaFin: {
                gte:
                  new Date(),
              },
            },
          ],
        },

        select: {
          sucursalId: true,
        },

        orderBy: {
          fechaInicio:
            "desc",
        },
      });

  return (
    assignment
      ?.sucursalId ??
    null
  );
}

async function saveAudit(
  request: Request,
  response: Response,
): Promise<void> {
  try {
    if (
      !request.auth ||
      response.statusCode < 200 ||
      response.statusCode >= 400
    ) {
      return;
    }

    const pathInformation =
      getAuditPathInformation(
        request.originalUrl,
      );

    if (
      !pathInformation
        .moduleSegment ||
      EXCLUDED_MODULES.has(
        pathInformation
          .moduleSegment,
      )
    ) {
      return;
    }

    const action =
      getAuditAction(
        request.method,
        request.originalUrl,
      );

    const branchId =
      await resolveBranchId(
        request,
        pathInformation.modulo,
        pathInformation
          .entidadId,
      );

    const sanitizedBody =
      sanitizeAuditData(
        request.body,
      );

    const userAgent =
      request.get(
        "user-agent",
      );

    await prisma.auditoria.create({
      data: {
        usuarioId:
          request.auth.usuarioId,

        sucursalId:
          branchId,

        accion:
          action,

        modulo:
          pathInformation
            .modulo,

        entidad:
          pathInformation
            .entidad,

        entidadId:
          pathInformation
            .entidadId,

        descripcion:
          createAuditDescription(
            action,
            pathInformation
              .entidad,
          ),

        ...(sanitizedBody !==
        undefined
          ? {
              datosNuevos:
                sanitizedBody,
            }
          : {}),

        direccionIp:
          request.ip
            ?.slice(0, 64) ??
          null,

        userAgent:
          userAgent
            ?.slice(0, 500) ??
          null,
      },
    });
  } catch (error: unknown) {
    console.error(
      "No se pudo registrar la auditoría:",
      error,
    );
  }
}

export function auditMutationMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  if (
    !MUTATION_METHODS.has(
      request.method,
    )
  ) {
    next();
    return;
  }

  response.on(
    "finish",
    () => {
      void saveAudit(
        request,
        response,
      );
    },
  );

  next();
}