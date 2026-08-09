import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import {
  requestAutomaticBackupIfDue,
} from "./backup.service.js";

let interval:
  NodeJS.Timeout | null = null;
let initialTimer:
  NodeJS.Timeout | null = null;
let isRunning = false;

async function runScheduledBackup(): Promise<void> {
  if (isRunning) {
    return;
  }

  isRunning = true;

  try {
    await requestAutomaticBackupIfDue();
  } catch (error: unknown) {
    logger.error(
      {
        error,
      },
      "No se pudo evaluar el respaldo automático.",
    );
  } finally {
    isRunning = false;
  }
}

export function startBackupScheduler(): void {
  if (!env.BACKUP_ENABLED || interval) {
    return;
  }

  initialTimer = setTimeout(
    () => {
      void runScheduledBackup();
    },
    10_000,
  );
  initialTimer.unref();

  interval = setInterval(
    () => {
      void runScheduledBackup();
    },
    Math.min(
      env.BACKUP_INTERVAL_HOURS,
      24,
    ) *
      60 *
      60 *
      1_000,
  );
  interval.unref();

  logger.info(
    {
      intervalHours:
        env.BACKUP_INTERVAL_HOURS,
      retentionDays:
        env.BACKUP_RETENTION_DAYS,
    },
    "Programador de respaldos iniciado.",
  );
}

export function stopBackupScheduler(): void {
  if (initialTimer) {
    clearTimeout(initialTimer);
    initialTimer = null;
  }

  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}
