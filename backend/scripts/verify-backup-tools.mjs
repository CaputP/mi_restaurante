import "dotenv/config";

import {
  createHash,
} from "node:crypto";
import {
  spawn,
} from "node:child_process";
import {
  createReadStream,
} from "node:fs";
import {
  mkdtemp,
  rm,
  stat,
} from "node:fs/promises";
import {
  tmpdir,
} from "node:os";
import {
  join,
} from "node:path";

function run(
  command,
  args,
  environment,
) {
  return new Promise(
    (resolveProcess, reject) => {
      const child = spawn(
        command,
        args,
        {
          shell: false,
          windowsHide: true,
          env: environment,
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
        (chunk) => {
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
                `${command} terminó con código ${code ?? "desconocido"}.`,
            ),
          );
        },
      );
    },
  );
}

function checksumFile(path) {
  return new Promise(
    (resolveChecksum, reject) => {
      const hash = createHash("sha256");
      const stream = createReadStream(path);

      stream.on(
        "data",
        (chunk) => hash.update(chunk),
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

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL es obligatoria.",
  );
}

const databaseUrl =
  new URL(process.env.DATABASE_URL);
const databaseName =
  decodeURIComponent(
    databaseUrl.pathname.replace(
      /^\//,
      "",
    ),
  );
const databaseUser =
  decodeURIComponent(
    databaseUrl.username,
  );
const processEnvironment = {
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
          ),
      }
    : {}),
};
const temporaryDirectory =
  await mkdtemp(
    join(
      tmpdir(),
      "vallecito-backup-check-",
    ),
  );
const target = join(
  temporaryDirectory,
  "verification.dump",
);

try {
  await run(
    process.env.PG_DUMP_PATH ??
      "pg_dump",
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
      databaseUser,
      "--dbname",
      databaseName,
      "--file",
      target,
    ],
    processEnvironment,
  );

  await run(
    process.env.PG_RESTORE_PATH ??
      "pg_restore",
    [
      "--list",
      target,
    ],
    processEnvironment,
  );

  const [fileStats, checksum] =
    await Promise.all([
      stat(target),
      checksumFile(target),
    ]);

  console.info(
    `Herramientas de respaldo verificadas: ${fileStats.size} bytes, SHA-256 ${checksum.length} caracteres.`,
  );
} finally {
  await rm(
    temporaryDirectory,
    {
      recursive: true,
      force: true,
    },
  );
}
