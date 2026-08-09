import { app } from "./app.js";
import { env } from "./config/env.js";
import {
  logger,
} from "./lib/logger.js";
import { prisma } from "./lib/prisma.js";
import {
  startBackupScheduler,
  stopBackupScheduler,
} from "./modules/backups/backup.scheduler.js";
import {
  closeRealtimeConnections,
  startRealtimeBroker,
  stopRealtimeBroker,
} from "./modules/realtime/realtime-broker.js";

let isShuttingDown = false;

const server = app.listen(env.PORT, () => {
  logger.info(
    {
      port:
        env.PORT,
    },
    "Servidor iniciado.",
  );

  startBackupScheduler();
  void startRealtimeBroker();
});

server.requestTimeout =
  env.SERVER_REQUEST_TIMEOUT_MS;
server.headersTimeout =
  env.SERVER_HEADERS_TIMEOUT_MS;
server.keepAliveTimeout =
  env.SERVER_KEEP_ALIVE_TIMEOUT_MS;

async function closeServer(
  signal: string,
): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  stopBackupScheduler();
  closeRealtimeConnections();

  logger.info(
    {
      signal,
    },
    "Cerrando servidor.",
  );

  const forceCloseTimer =
    setTimeout(
      () => {
        logger.error(
          "El cierre superó el tiempo permitido; se finalizarán las conexiones.",
        );

        server.closeAllConnections();
      },
      10_000,
    );

  forceCloseTimer.unref();

  server.close(async () => {
    clearTimeout(
      forceCloseTimer,
    );

    try {
      await stopRealtimeBroker();
      await prisma.$disconnect();

      logger.info(
        "Servidor cerrado correctamente.",
      );

      process.exit(0);
    } catch (error: unknown) {
      logger.error(
        {
          error,
        },
        "No se pudo cerrar la conexión de base de datos.",
      );

      process.exit(1);
    }
  });
}

process.on("SIGINT", () => {
  void closeServer("SIGINT");
});

process.on("SIGTERM", () => {
  void closeServer("SIGTERM");
});

process.on(
  "unhandledRejection",
  (reason) => {
    logger.fatal(
      {
        reason,
      },
      "Promesa rechazada sin manejar.",
    );

    void closeServer(
      "UNHANDLED_REJECTION",
    );
  },
);

process.on(
  "uncaughtException",
  (error) => {
    logger.fatal(
      {
        error,
      },
      "Excepción no controlada.",
    );

    void closeServer(
      "UNCAUGHT_EXCEPTION",
    );
  },
);
