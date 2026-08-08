import {
  Router,
} from "express";

import {
  requireAuth,
} from "../../middlewares/auth.middleware.js";

import {
  getUnreadNotificationCountController,
  listMyNotificationsController,
  markAllNotificationsAsReadController,
  markNotificationAsReadController,
  markNotificationAsUnreadController,
} from "./notifications.controller.js";

export const notificationRouter =
  Router();

notificationRouter.use(
  requireAuth,
);

notificationRouter.get(
  "/unread-count",
  getUnreadNotificationCountController,
);

notificationRouter.get(
  "/",
  listMyNotificationsController,
);

notificationRouter.patch(
  "/read-all",
  markAllNotificationsAsReadController,
);

notificationRouter.patch(
  "/:id/read",
  markNotificationAsReadController,
);

notificationRouter.patch(
  "/:id/unread",
  markNotificationAsUnreadController,
);