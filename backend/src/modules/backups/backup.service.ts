import {
  createHash,
} from "node:crypto";
import {
  createReadStream,
} from "node:fs";
import {
  mkdir,
  stat,
  unlink,
} from "node:fs/promises";
import {
  resolve,
  sep,
} from "node:path";
import {
  spawn,
} from "node:child_process";

import {
  Prisma,
} from "../../generated/prisma/client.js";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { prisma } from "../../lib/prisma.js";
import { withSerializableTransaction } from "../../lib/transaction.js";
import { AppError } from "../../shared/errors/app-error.js";
import { reauthenticateUser } from "../../shared/security/reauthentication.js";
import {
  createRoleNotifications,
} from "../notifications/notification-generator.service.js";
import {
  publishRealtimeChange,
} from "../realtime/realtime-broker.js";

import type {
  ListBackupsQuery,
} from "./backup.schema.js";

const backupRoot =
  resolve(
    env.BACKUP_DIRECTORY,
  );
const automaticBackupLockId =
  8_270_501;

function serializeBackup(
  backup: {
    id: string;
    tipo: string;
    estado: string;
    nombreArchivo: string | null;
    tamanoBytes: bigint | null;
    checksum: string | null;
    fechaInicio: Date | null;
    fechaFin: Date | null;
    fechaEliminacion: Date | null;
    mensajeError: string | null;
    createdAt: Date;
    solicitadoPor: {
      id: string;
      nombres: string;
      apellidos: string;
    } | null;
  },
) {
  return {
    ...backup,
    tamanoBytes:
      backup.tamanoBytes
        ?.toString() ?? null,
    fechaInicio:
      backup.fechaInicio
        ?.toISOString() ?? null,
    fechaFin:
      backup.fechaFin
        ?.toISOString() ?? null,
    fechaEliminacion:
      backup.fechaEliminacion
        ?.toISOString() ?? null,
    createdAt:
      backup.createdAt.toISOString(),
    disponible:
      backup.estado === "COMPLETADO" &&
      !backup.fechaEliminacion &&
      Boolean(backup.nombreArchivo),
    solicitadoPor:
      backup.solicitadoPor
        ? {
            id: backup.solicitadoPor.id,
            nombreCompleto:
              `${backup.solicitadoPor.nombres} ${backup.solicitadoPor.apellidos}`.trim(),
          }
        : null,
  };
}

function createBackupFilename(
  backupId: string,
): string {
  const timestamp =
    new Date()
      .toISOString()
      .replaceAll(":", "-")
      .replaceAll(".", "-");

  return `vallecito-${timestamp}-${backupId}.dump`;
}

function assertInsideBackupRoot(
  path: string,
): void {
  const resolvedPath = resolve(path);

  if (
    resolvedPath !== backupRoot &&
    !resolvedPath.startsWith(
      `${backupRoot}${sep}`,
    )
  ) {
    throw new AppError(
      500,
      "La ruta del respaldo no es segura.",
      "RUTA_RESPALDO_INVALIDA",
    );
  }
}

async function checksumFile(
  path: string,
): Promise<string> {
  return new Promise(
    (resolveChecksum, reject) => {
      const hash =
        createHash("sha256");
      const stream =
        createReadStream(path);

      stream.on(
        "data",
        (chunk) =>
          hash.update(chunk),
      );
      stream.on("error", reject);
      stream.on(
        "end",
        () =>
          resolveChecksum(
            hash.digest("hex"),
          ),
      );
    },
  );
}

async function runPgDump(
  targetPath: string,
): Promise<void> {
  const databaseUrl =
    new URL(env.DATABASE_URL);
  const databaseName =
    decodeURIComponent(
      databaseUrl.pathname.replace(
        /^\//,
        "",
      ),
    );

  await new Promise<void>(
    (resolveProcess, reject) => {
      const child = spawn(
        env.PG_DUMP_PATH,
        [
          "--format=custom",
          "--compress=6",
          "--no-owner",
          "--no-privileges",
          "--host",
          databaseUrl.hostname,
          "--port",
          databaseUrl.port || "5432",
          "--username",
          decodeURIComponent(
            databaseUrl.username,
          ),
          "--dbname",
          databaseName,
          "--file",
          targetPath,
        ],
        {
          shell: false,
          windowsHide: true,
          env: {
            ...process.env,
            PGPASSWORD:
              decodeURIComponent(
                databaseUrl.password,
              ),
            ...(databaseUrl.searchParams.get(
              "sslmode",
            )
              ? {
                  PGSSLMODE:
                    databaseUrl.searchParams.get(
                      "sslmode",
                    ) ?? undefined,
                }
              : {}),
          },
          stdio: [
            "ignore",
            "ignore",
            "pipe",
          ],
        },
      );

      let standardError = "";
      child.stderr.on(
        "data",
        (chunk: Buffer) => {
          if (
            standardError.length <
            4_000
          ) {
            standardError +=
              chunk.toString("utf8");
          }
        },
      );
      child.on("error", reject);
      child.on(
        "close",
        (code) => {
          if (code === 0) {
            resolveProcess();
            return;
          }

          reject(
            new Error(
              standardError.trim() ||
                `pg_dump terminó con el código ${code ?? "desconocido"}.`,
            ),
          );
        },
      );
    },
  );
}

async function applyRetentionPolicy(): Promise<void> {
  const expiration = new Date(
    Date.now() -
      env.BACKUP_RETENTION_DAYS *
        24 *
        60 *
        60 *
        1_000,
  );

  const expiredBackups =
    await prisma.respaldo.findMany({
      where: {
        estado: "COMPLETADO",
        fechaEliminacion: null,
        fechaFin: {
          lt: expiration,
        },
        rutaArchivo: {
          not: null,
        },
      },
      select: {
        id: true,
        rutaArchivo: true,
      },
      take: 100,
    });

  for (const backup of expiredBackups) {
    if (!backup.rutaArchivo) {
      continue;
    }

    try {
      assertInsideBackupRoot(
        backup.rutaArchivo,
      );
      await unlink(
        backup.rutaArchivo,
      );
    } catch (error: unknown) {
      if (
        !(
          error instanceof Error &&
          "code" in error &&
          error.code === "ENOENT"
        )
      ) {
        logger.warn(
          {
            error,
            backupId: backup.id,
          },
          "No se pudo eliminar un respaldo vencido.",
        );
        continue;
      }
    }

    await prisma.respaldo.update({
      where: {
        id: backup.id,
      },
      data: {
        rutaArchivo: null,
        fechaEliminacion:
          new Date(),
      },
    });
  }
}

export async function executeBackup(
  backupId: string,
): Promise<void> {
  const claimed =
    await prisma.respaldo.updateMany({
      where: {
        id: backupId,
        estado: "PENDIENTE",
      },
      data: {
        estado: "EN_PROCESO",
        fechaInicio: new Date(),
        mensajeError: null,
      },
    });

  if (claimed.count !== 1) {
    return;
  }

  const filename =
    createBackupFilename(
      backupId,
    );
  const targetPath =
    resolve(
      backupRoot,
      filename,
    );
  assertInsideBackupRoot(targetPath);

  try {
    await mkdir(
      backupRoot,
      {
        recursive: true,
        mode: 0o700,
      },
    );
    await runPgDump(targetPath);

    const [fileStats, checksum] =
      await Promise.all([
        stat(targetPath),
        checksumFile(targetPath),
      ]);

    await prisma.respaldo.update({
      where: {
        id: backupId,
      },
      data: {
        estado: "COMPLETADO",
        nombreArchivo: filename,
        rutaArchivo: targetPath,
        tamanoBytes:
          BigInt(fileStats.size),
        checksum,
        fechaFin: new Date(),
      },
    });

    await applyRetentionPolicy();

    await prisma.$transaction(
      async (transaction) => {
        await createRoleNotifications(
          transaction,
          {
            roles: [
              "ADMINISTRADOR_GENERAL",
            ],
            tipo:
              "RESPALDO",
            prioridad:
              "NORMAL",
            titulo:
              "Respaldo completado",
            mensaje:
              "La copia de seguridad de la base de datos finalizó correctamente.",
            entidad:
              "Respaldo",
            entidadId:
              backupId,
          },
        );
      },
    );

    await publishRealtimeChange([
      "BACKUPS",
    ]);

    logger.info(
      {
        backupId,
        sizeBytes: fileStats.size,
      },
      "Respaldo de base de datos completado.",
    );
  } catch (error: unknown) {
    try {
      await unlink(targetPath);
    } catch {
      // El archivo parcial puede no existir.
    }

    const message =
      error instanceof Error
        ? error.message.slice(0, 2_000)
        : "Error desconocido al crear el respaldo.";

    await prisma.respaldo.update({
      where: {
        id: backupId,
      },
      data: {
        estado: "FALLIDO",
        fechaFin: new Date(),
        mensajeError: message,
      },
    });

    await prisma.$transaction(
      async (transaction) => {
        await createRoleNotifications(
          transaction,
          {
            roles: [
              "ADMINISTRADOR_GENERAL",
            ],
            tipo:
              "RESPALDO",
            prioridad:
              "CRITICA",
            titulo:
              "Falló el respaldo",
            mensaje:
              "La copia de seguridad no pudo completarse. Revisa el módulo de respaldos y los registros del servidor.",
            entidad:
              "Respaldo",
            entidadId:
              backupId,
          },
        );
      },
    );

    await publishRealtimeChange([
      "BACKUPS",
    ]);

    logger.error(
      {
        error,
        backupId,
      },
      "El respaldo de base de datos falló.",
    );
  }
}

export async function listBackups(
  query: ListBackupsQuery,
) {
  const where:
    Prisma.RespaldoWhereInput =
      query.estado === "TODOS"
        ? {}
        : {
            estado: query.estado,
          };
  const skip =
    (query.page - 1) *
    query.limit;

  const [total, backups] =
    await prisma.$transaction([
      prisma.respaldo.count({
        where,
      }),
      prisma.respaldo.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          tipo: true,
          estado: true,
          nombreArchivo: true,
          tamanoBytes: true,
          checksum: true,
          fechaInicio: true,
          fechaFin: true,
          fechaEliminacion: true,
          mensajeError: true,
          createdAt: true,
          solicitadoPor: {
            select: {
              id: true,
              nombres: true,
              apellidos: true,
            },
          },
        },
      }),
    ]);

  return {
    respaldos:
      backups.map(
        serializeBackup,
      ),
    retencionDias:
      env.BACKUP_RETENTION_DAYS,
    automatizacionActiva:
      env.BACKUP_ENABLED,
    intervaloHoras:
      env.BACKUP_INTERVAL_HOURS,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages:
        Math.max(
          1,
          Math.ceil(
            total / query.limit,
          ),
        ),
    },
  };
}

export async function requestManualBackup(
  userId: string,
  password: string,
) {
  await reauthenticateUser(
    userId,
    password,
  );

  const backup =
    await withSerializableTransaction(
      async (transaction) => {
        const running =
          await transaction.respaldo.findFirst({
            where: {
              estado: {
                in: [
                  "PENDIENTE",
                  "EN_PROCESO",
                ],
              },
            },
            select: {
              id: true,
            },
          });

        if (running) {
          throw new AppError(
            409,
            "Ya existe un respaldo en ejecución.",
            "RESPALDO_EN_PROCESO",
          );
        }

        return transaction.respaldo.create({
          data: {
            solicitadoPorId: userId,
            tipo: "MANUAL",
            estado: "PENDIENTE",
          },
          select: {
            id: true,
          },
        });
      },
    );

  setImmediate(() => {
    void executeBackup(
      backup.id,
    );
  });

  return backup;
}

export async function requestAutomaticBackupIfDue(): Promise<void> {
  if (!env.BACKUP_ENABLED) {
    return;
  }

  const backupId =
    await withSerializableTransaction(
      async (transaction) => {
        const lockResult =
          await transaction.$queryRaw<
            Array<{
              acquired: boolean;
            }>
          >(
            Prisma.sql`
              SELECT pg_try_advisory_xact_lock(${automaticBackupLockId}) AS "acquired"
            `,
          );

        if (!lockResult[0]?.acquired) {
          return null;
        }

        const cutoff = new Date(
          Date.now() -
            env.BACKUP_INTERVAL_HOURS *
              60 *
              60 *
              1_000,
        );
        const recent =
          await transaction.respaldo.findFirst({
            where: {
              createdAt: {
                gte: cutoff,
              },
              estado: {
                in: [
                  "PENDIENTE",
                  "EN_PROCESO",
                  "COMPLETADO",
                ],
              },
            },
            select: {
              id: true,
            },
          });

        if (recent) {
          return null;
        }

        const backup =
          await transaction.respaldo.create({
            data: {
              tipo: "AUTOMATICO",
              estado: "PENDIENTE",
            },
            select: {
              id: true,
            },
          });

        return backup.id;
      },
    );

  if (backupId) {
    await executeBackup(backupId);
  }
}
