import {
  Router,
} from "express";

import {
  requireAuth,
} from "../../middlewares/auth.middleware.js";
import {
  realtimeEventsController,
} from "./realtime.controller.js";

export const realtimeRouter =
  Router();

realtimeRouter.get(
  "/events",
  requireAuth,
  realtimeEventsController,
);
