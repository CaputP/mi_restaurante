import "dotenv/config";

import {
  createHash,
  timingSafeEqual,
} from "node:crypto";
import {
  createReadStream,
} from "node:fs";
import {
  realpath,
} from "node:fs/promises";
import {
  resolve,
  sep,
} from "node:path";
import {
  spawn,
} from "node:child_process";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0
    ? process.argv[index + 1]
    : undefined;
}

function run(
  command,
  args,
  environment = process.env,
) {
  return new Promise((resolveProcess, reject) => {
    const child = spawn(
      command,
      args,
      {
        shell: false,
        windowsHide: true,
        stdio: "inherit",
        env: environment,
      },
    );

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolveProcess();
        return;
      }

      reject(
        new Error(
          `${command} terminó con código ${code ?? "desconocido"}.`,
        ),
      );
    });
  });
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

if (
  process.env.ALLOW_DATABASE_RESTORE !==
  "true"
) {
  throw new Error(
    "La restauración está bloqueada. Define ALLOW_DATABASE_RESTORE=true durante una ventana de mantenimiento.",
  );
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL es obligatoria.",
  );
}

const fileArgument = argument("--file");
const confirmation = argument("--confirm");
const expectedChecksum =
  argument("--sha256")?.toLowerCase();

if (!fileArgument) {
  throw new Error(
    "Usa --file <respaldo.dump>.",
  );
}

if (
  !expectedChecksum ||
  !/^[a-f0-9]{64}$/.test(
    expectedChecksum,
  )
) {
  throw new Error(
    "Usa --sha256 <checksum registrado> para validar la integridad del respaldo.",
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
const databasePassword =
  decodeURIComponent(
    databaseUrl.password,
  );

if (
  !databaseName ||
  confirmation !== databaseName
) {
  throw new Error(
    `Confirma el destino con --confirm ${databaseName || "<base_de_datos>"}.`,
  );
}

const backupRoot = resolve(
  process.env.BACKUP_DIRECTORY ??
    "./backups",
);
const backupFile =
  await realpath(
    resolve(fileArgument),
  );

if (
  backupFile !== backupRoot &&
  !backupFile.startsWith(
    `${backupRoot}${sep}`,
  )
) {
  throw new Error(
    "El archivo debe encontrarse dentro de BACKUP_DIRECTORY.",
  );
}

const actualChecksum =
  await checksumFile(backupFile);
const checksumMatches = timingSafeEqual(
  Buffer.from(
    expectedChecksum,
    "hex",
  ),
  Buffer.from(
    actualChecksum,
    "hex",
  ),
);

if (!checksumMatches) {
  throw new Error(
    "El checksum SHA-256 no coincide. La restauración fue cancelada sin modificar la base de datos.",
  );
}

const pgRestore =
  process.env.PG_RESTORE_PATH ??
  "pg_restore";

console.info(
  "Validando la estructura del respaldo...",
);
await run(
  pgRestore,
  ["--list", backupFile],
);

console.info(
  `Restaurando ${backupFile} sobre ${databaseName}. Mantén la API detenida hasta que termine.`,
);
await run(
  pgRestore,
  [
    "--clean",
    "--if-exists",
    "--no-owner",
    "--no-privileges",
    "--exit-on-error",
    "--host",
    databaseUrl.hostname,
    "--port",
    databaseUrl.port || "5432",
    "--username",
    databaseUser,
    "--dbname",
    databaseName,
    backupFile,
  ],
  {
    ...process.env,
    PGPASSWORD: databasePassword,
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
  },
);

console.info(
  "Restauración completada. Ejecuta migraciones, preflight y pruebas de humo antes de reabrir la API.",
);
