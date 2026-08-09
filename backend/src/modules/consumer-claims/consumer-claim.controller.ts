import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../shared/errors/app-error.js";
import {
  consumerClaimIdSchema,
  createConsumerClaimSchema,
  listConsumerClaimsSchema,
  receiptParamsSchema,
  receiptQuerySchema,
  updateConsumerClaimSchema,
} from "./consumer-claim.schema.js";
import {
  createConsumerClaim,
  getConsumerClaim,
  getConsumerClaimOptions,
  getConsumerClaimReceipt,
  listConsumerClaims,
  updateConsumerClaim,
} from "./consumer-claim.service.js";

function getAuth(request: Request) {
  if (!request.auth) throw new AppError(401, "Debes iniciar sesión.", "TOKEN_REQUERIDO");
  return { usuarioId: request.auth.usuarioId, rol: request.auth.rol };
}

export async function optionsController(_request: Request, response: Response, next: NextFunction) {
  try {
    response.json({ success: true, data: { sucursales: await getConsumerClaimOptions() } });
  } catch (error) { next(error); }
}

export async function createController(request: Request, response: Response, next: NextFunction) {
  try {
    const result = await createConsumerClaim(createConsumerClaimSchema.parse(request.body));
    response.status(201).json({
      success: true,
      message: "Tu registro fue recibido. Conserva el código y el enlace privado de la constancia.",
      data: result,
    });
  } catch (error) { next(error); }
}

export async function receiptController(request: Request, response: Response, next: NextFunction) {
  try {
    const { codigo } = receiptParamsSchema.parse(request.params);
    const { token } = receiptQuerySchema.parse(request.query);
    response.json({ success: true, data: { reclamo: await getConsumerClaimReceipt(codigo, token) } });
  } catch (error) { next(error); }
}

export async function listController(request: Request, response: Response, next: NextFunction) {
  try {
    response.json({ success: true, data: await listConsumerClaims(getAuth(request), listConsumerClaimsSchema.parse(request.query)) });
  } catch (error) { next(error); }
}

export async function getController(request: Request, response: Response, next: NextFunction) {
  try {
    const { id } = consumerClaimIdSchema.parse(request.params);
    response.json({ success: true, data: { reclamo: await getConsumerClaim(getAuth(request), id) } });
  } catch (error) { next(error); }
}

export async function updateController(request: Request, response: Response, next: NextFunction) {
  try {
    const { id } = consumerClaimIdSchema.parse(request.params);
    const reclamo = await updateConsumerClaim(getAuth(request), id, updateConsumerClaimSchema.parse(request.body));
    response.json({ success: true, message: "El reclamo fue actualizado correctamente.", data: { reclamo } });
  } catch (error) { next(error); }
}
