import { Router } from "express";

import {
  requireAuth,
  requirePermissions,
  requireRoles,
} from "../../middlewares/auth.middleware.js";

import {
  createCategoryController,
  listCategoriesController,
  updateCategoryController,
  updateCategoryStatusController,
} from "./catalog.controller.js";

import {
  createProductController,
  getProductOptionsController,
  listProductsController,
  updateProductController,
  updateProductStatusController,
} from "./product.controller.js";

export const catalogRouter = Router();

catalogRouter.use(
  requireAuth,
  requireRoles(
    "ADMINISTRADOR_GENERAL",
    "ADMINISTRADOR_SUCURSAL",
  ),
);

/*
 * Categorías
 */
catalogRouter.get(
  "/categories",
  listCategoriesController,
);

catalogRouter.post(
  "/categories",
  createCategoryController,
);

catalogRouter.patch(
  "/categories/:id",
  updateCategoryController,
);

catalogRouter.patch(
  "/categories/:id/status",
  updateCategoryStatusController,
);

/*
 * Productos
 */
catalogRouter.get(
  "/product-options",
  getProductOptionsController,
);

catalogRouter.get(
  "/products",
  listProductsController,
);

catalogRouter.post(
  "/products",
  createProductController,
);

catalogRouter.patch(
  "/products/:id",
  updateProductController,
);

catalogRouter.patch(
  "/products/:id/status",
  updateProductStatusController,
);

catalogRouter.use(
  requirePermissions(
    "PRODUCTO_GESTIONAR",
  ),
);
