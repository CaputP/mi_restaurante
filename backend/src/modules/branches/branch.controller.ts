import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  branchIdSchema,
  branchZoneIdSchema,
  createBranchSchema,
  createZoneSchema,
  listBranchesQuerySchema,
  updateBranchSchema,
  updateBranchStateSchema,
  updateZoneSchema,
  updateZoneStateSchema,
} from "./branch.schema.js";

import {
  createBranch,
  createZone,
  getBranchById,
  listBranches,
  updateBranch,
  updateBranchState,
  updateZone,
  updateZoneState,
} from "./branch.service.js";

export async function listBranchesController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query =
      listBranchesQuerySchema.parse(
        request.query,
      );

    const result =
      await listBranches(
        query,
      );

    response.status(200).json({
      success: true,
      message:
        "Sucursales obtenidas correctamente.",
      data:
        result,
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function getBranchByIdController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } =
      branchIdSchema.parse(
        request.params,
      );

    const branch =
      await getBranchById(
        id,
      );

    response.status(200).json({
      success: true,
      message:
        "Sucursal obtenida correctamente.",

      data: {
        sucursal:
          branch,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function createBranchController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input =
      createBranchSchema.parse(
        request.body,
      );

    const branch =
      await createBranch(
        input,
      );

    response.status(201).json({
      success: true,
      message:
        "Sucursal creada correctamente.",

      data: {
        sucursal:
          branch,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function updateBranchController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } =
      branchIdSchema.parse(
        request.params,
      );

    const input =
      updateBranchSchema.parse(
        request.body,
      );

    const branch =
      await updateBranch(
        id,
        input,
      );

    response.status(200).json({
      success: true,
      message:
        "Sucursal actualizada correctamente.",

      data: {
        sucursal:
          branch,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function updateBranchStateController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } =
      branchIdSchema.parse(
        request.params,
      );

    const input =
      updateBranchStateSchema.parse(
        request.body,
      );

    const branch =
      await updateBranchState(
        id,
        input,
      );

    response.status(200).json({
      success: true,
      message:
        "Estado de la sucursal actualizado correctamente.",

      data: {
        sucursal:
          branch,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function createZoneController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } =
      branchIdSchema.parse(
        request.params,
      );

    const input =
      createZoneSchema.parse(
        request.body,
      );

    const branch =
      await createZone(
        id,
        input,
      );

    response.status(201).json({
      success: true,
      message:
        "Zona creada correctamente.",

      data: {
        sucursal:
          branch,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function updateZoneController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const {
      id,
      zoneId,
    } =
      branchZoneIdSchema.parse(
        request.params,
      );

    const input =
      updateZoneSchema.parse(
        request.body,
      );

    const branch =
      await updateZone(
        id,
        zoneId,
        input,
      );

    response.status(200).json({
      success: true,
      message:
        "Zona actualizada correctamente.",

      data: {
        sucursal:
          branch,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function updateZoneStateController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const {
      id,
      zoneId,
    } =
      branchZoneIdSchema.parse(
        request.params,
      );

    const input =
      updateZoneStateSchema.parse(
        request.body,
      );

    const branch =
      await updateZoneState(
        id,
        zoneId,
        input,
      );

    response.status(200).json({
      success: true,
      message:
        "Estado de la zona actualizado correctamente.",

      data: {
        sucursal:
          branch,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}