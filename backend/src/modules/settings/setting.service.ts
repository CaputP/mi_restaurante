import {
  Prisma,
} from "../../generated/prisma/client.js";

import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";

import type {
  CorrelativeDocumentType,
  CreateSettingInput,
  ListCorrelativesQuery,
  ListSettingsQuery,
  SettingOptionsQuery,
  UpdateCorrelativeInput,
  UpdateSettingEditabilityInput,
  UpdateSettingInput,
} from "./setting.schema.js";

type SettingAuth = {
  usuarioId: string;
  rol: string;
};

const DATA_TYPES = [
  {
    codigo: "TEXTO",
    nombre: "Texto",
  },
  {
    codigo: "ENTERO",
    nombre: "Número entero",
  },
  {
    codigo: "DECIMAL",
    nombre: "Número decimal",
  },
  {
    codigo: "BOOLEANO",
    nombre: "Verdadero o falso",
  },
  {
    codigo: "JSON",
    nombre: "Objeto JSON",
  },
  {
    codigo: "FECHA",
    nombre: "Fecha",
  },
  {
    codigo: "HORA",
    nombre: "Hora",
  },
] as const;

const DOCUMENT_TYPES = [
  {
    codigo: "RESERVA",
    nombre: "Reserva",
    prefijoSugerido: "R",
  },
  {
    codigo: "CONSTANCIA_RESERVA",
    nombre: "Constancia de adelanto",
    prefijoSugerido: "AR",
  },
  {
    codigo: "PEDIDO",
    nombre: "Pedido",
    prefijoSugerido: "P",
  },
  {
    codigo: "COMANDA",
    nombre: "Comanda",
    prefijoSugerido: "C",
  },
  {
    codigo: "TICKET",
    nombre: "Ticket de venta",
    prefijoSugerido: "T",
  },
  {
    codigo: "CAJA",
    nombre: "Caja",
    prefijoSugerido: "CJ",
  },
  {
    codigo: "GASTO",
    nombre: "Gasto",
    prefijoSugerido: "G",
  },
] as const;

const FORBIDDEN_KEY_PARTS = [
  "PASSWORD",
  "SECRET",
  "TOKEN",
  "PRIVATE_KEY",
  "CLIENT_SECRET",
  "DATABASE_URL",
  "API_KEY",
  "ACCESS_KEY",
];

const settingSelect = {
  id: true,
  sucursalId: true,
  clave: true,
  claveUnica: true,
  valor: true,
  tipoDato: true,
  descripcion: true,
  editable: true,
  createdAt: true,
  updatedAt: true,

  sucursal: {
    select: {
      id: true,
      codigo: true,
      nombre: true,
    },
  },

  actualizadoPor: {
    select: {
      id: true,
      nombres: true,
      apellidos: true,
    },
  },
} satisfies Prisma.ConfiguracionSistemaSelect;

type SettingRecord =
  Prisma.ConfiguracionSistemaGetPayload<{
    select:
      typeof settingSelect;
  }>;

function getOperationalDate(): Date {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          "America/Lima",

        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      },
    ).formatToParts(
      new Date(),
    );

  const year =
    parts.find(
      (part) =>
        part.type === "year",
    )?.value;

  const month =
    parts.find(
      (part) =>
        part.type === "month",
    )?.value;

  const day =
    parts.find(
      (part) =>
        part.type === "day",
    )?.value;

  if (!year || !month || !day) {
    throw new AppError(
      500,
      "No se pudo determinar la fecha operativa.",
      "FECHA_OPERATIVA_INVALIDA",
    );
  }

  return new Date(
    `${year}-${month}-${day}T00:00:00.000Z`,
  );
}

function userFullName(
  user: {
    nombres: string;
    apellidos: string;
  },
): string {
  return `${user.nombres} ${user.apellidos}`.trim();
}

async function getAuthorizedBranches(
  auth: SettingAuth,
) {
  if (
    auth.rol ===
    "ADMINISTRADOR_GENERAL"
  ) {
    return prisma.sucursal.findMany({
      where: {
        deletedAt: null,

        estado: {
          not:
            "ARCHIVADO",
        },
      },

      select: {
        id: true,
        codigo: true,
        nombre: true,
        direccion: true,
        estado: true,
      },

      orderBy: {
        nombre: "asc",
      },
    });
  }

  const operationalDate =
    getOperationalDate();

  const assignments =
    await prisma
      .usuarioSucursal
      .findMany({
        where: {
          usuarioId:
            auth.usuarioId,

          activo: true,

          fechaInicio: {
            lte:
              operationalDate,
          },

          OR: [
            {
              fechaFin: null,
            },
            {
              fechaFin: {
                gte:
                  operationalDate,
              },
            },
          ],

          sucursal: {
            deletedAt: null,

            estado: {
              not:
                "ARCHIVADO",
            },
          },
        },

        select: {
          sucursal: {
            select: {
              id: true,
              codigo: true,
              nombre: true,
              direccion: true,
              estado: true,
            },
          },
        },
      });

  return assignments
    .map(
      (assignment) =>
        assignment.sucursal,
    )
    .sort(
      (
        branchA,
        branchB,
      ) =>
        branchA.nombre.localeCompare(
          branchB.nombre,
          "es",
        ),
    );
}

function assertAuthorizedBranch(
  branches: Array<{
    id: string;
  }>,
  branchId: string,
): void {
  if (
    !branches.some(
      (branch) =>
        branch.id ===
        branchId,
    )
  ) {
    throw new AppError(
      403,
      "No tienes autorización para administrar esa sucursal.",
      "SUCURSAL_NO_AUTORIZADA",
    );
  }
}

function assertSafeSettingKey(
  key: string,
): void {
  const unsafePart =
    FORBIDDEN_KEY_PARTS.find(
      (part) =>
        key.includes(part),
    );

  if (unsafePart) {
    throw new AppError(
      400,
      "No está permitido guardar contraseñas, tokens o secretos en este módulo.",
      "CLAVE_CONFIGURACION_SENSIBLE",
    );
  }
}

function createUniqueKey(
  branchId: string | null,
  key: string,
): string {
  return branchId
    ? `SUCURSAL:${branchId}:${key}`
    : `GLOBAL:${key}`;
}

function normalizeSettingValue(
  dataType: string,
  value: unknown,
): Prisma.InputJsonValue {
  if (
    value === undefined ||
    value === null
  ) {
    throw new AppError(
      400,
      "El valor de la configuración es obligatorio.",
      "VALOR_CONFIGURACION_REQUERIDO",
    );
  }

  if (
    dataType === "TEXTO"
  ) {
    if (
      typeof value !==
      "string"
    ) {
      throw new AppError(
        400,
        "El valor debe ser un texto.",
        "TIPO_CONFIGURACION_INVALIDO",
      );
    }

    return value;
  }

  if (
    dataType === "ENTERO"
  ) {
    const numberValue =
      typeof value === "number"
        ? value
        : Number(value);

    if (
      !Number.isInteger(
        numberValue,
      )
    ) {
      throw new AppError(
        400,
        "El valor debe ser un número entero.",
        "TIPO_CONFIGURACION_INVALIDO",
      );
    }

    return numberValue;
  }

  if (
    dataType === "DECIMAL"
  ) {
    const numberValue =
      typeof value === "number"
        ? value
        : Number(value);

    if (
      !Number.isFinite(
        numberValue,
      )
    ) {
      throw new AppError(
        400,
        "El valor debe ser un número decimal válido.",
        "TIPO_CONFIGURACION_INVALIDO",
      );
    }

    return numberValue;
  }

  if (
    dataType === "BOOLEANO"
  ) {
    if (
      typeof value ===
      "boolean"
    ) {
      return value;
    }

    if (
      value === "true" ||
      value === "1"
    ) {
      return true;
    }

    if (
      value === "false" ||
      value === "0"
    ) {
      return false;
    }

    throw new AppError(
      400,
      "El valor debe ser verdadero o falso.",
      "TIPO_CONFIGURACION_INVALIDO",
    );
  }

  if (
    dataType === "FECHA"
  ) {
    if (
      typeof value !==
        "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(
        value,
      )
    ) {
      throw new AppError(
        400,
        "La fecha debe tener el formato YYYY-MM-DD.",
        "TIPO_CONFIGURACION_INVALIDO",
      );
    }

    return value;
  }

  if (
    dataType === "HORA"
  ) {
    if (
      typeof value !==
        "string" ||
      !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(
        value,
      )
    ) {
      throw new AppError(
        400,
        "La hora debe tener el formato HH:mm o HH:mm:ss.",
        "TIPO_CONFIGURACION_INVALIDO",
      );
    }

    return value;
  }

    if (
    dataType === "JSON"
    ) {
    if (
        typeof value !==
        "object" ||
        value === null
    ) {
      throw new AppError(
        400,
        "El valor JSON debe ser un objeto o una lista.",
        "TIPO_CONFIGURACION_INVALIDO",
      );
    }

    try {
      return JSON.parse(
        JSON.stringify(
          value,
        ),
      ) as Prisma.InputJsonValue;
    } catch {
      throw new AppError(
        400,
        "El valor no contiene un JSON válido.",
        "JSON_CONFIGURACION_INVALIDO",
      );
    }
  }

  throw new AppError(
    400,
    "El tipo de configuración no es válido.",
    "TIPO_CONFIGURACION_INVALIDO",
  );
}

function mapSetting(
  setting: SettingRecord,
) {
  return {
    id:
      setting.id,

    sucursalId:
      setting.sucursalId,

    alcance:
      setting.sucursalId
        ? "SUCURSAL"
        : "GLOBAL",

    clave:
      setting.clave,

    valor:
      setting.valor,

    tipoDato:
      setting.tipoDato,

    descripcion:
      setting.descripcion,

    editable:
      setting.editable,

    sucursal:
      setting.sucursal,

    actualizadoPor: {
      id:
        setting
          .actualizadoPor.id,

      nombreCompleto:
        userFullName(
          setting
            .actualizadoPor,
        ),
    },

    createdAt:
      setting.createdAt
        .toISOString(),

    updatedAt:
      setting.updatedAt
        .toISOString(),
  };
}

export async function getSettingOptions(
  auth: SettingAuth,
  query: SettingOptionsQuery,
) {
  const branches =
    await getAuthorizedBranches(
      auth,
    );

  if (query.sucursalId) {
    assertAuthorizedBranch(
      branches,
      query.sucursalId,
    );
  }

  return {
    sucursales:
      branches,

    sucursalSeleccionadaId:
      query.sucursalId ??
      (
        branches.length === 1
          ? branches[0]?.id
          : null
      ),

    tiposDato:
      DATA_TYPES,

    tiposDocumento:
      DOCUMENT_TYPES,

    puedeCrearGlobal:
      auth.rol ===
      "ADMINISTRADOR_GENERAL",
  };
}

export async function listSettings(
  auth: SettingAuth,
  query: ListSettingsQuery,
) {
  const branches =
    await getAuthorizedBranches(
      auth,
    );

  if (query.sucursalId) {
    assertAuthorizedBranch(
      branches,
      query.sucursalId,
    );
  }

  const branchIds =
    query.sucursalId
      ? [query.sucursalId]
      : branches.map(
          (branch) =>
            branch.id,
        );

  const scopeConditions:
    Prisma.ConfiguracionSistemaWhereInput[] =
      [];

  if (
    query.alcance ===
    "GLOBAL"
  ) {
    scopeConditions.push({
      sucursalId: null,
    });
  } else if (
    query.alcance ===
    "SUCURSAL"
  ) {
    scopeConditions.push({
      sucursalId: {
        in:
          branchIds,
      },
    });
  } else {
    scopeConditions.push(
      {
        sucursalId:
          null,
      },
      {
        sucursalId: {
          in:
            branchIds,
        },
      },
    );
  }

  const where:
    Prisma.ConfiguracionSistemaWhereInput = {
      OR:
        scopeConditions,

      ...(query.tipoDato
        ? {
            tipoDato:
              query.tipoDato,
          }
        : {}),

      ...(query.search
        ? {
            AND: [
              {
                OR: [
                  {
                    clave: {
                      contains:
                        query.search,

                      mode:
                        "insensitive",
                    },
                  },
                  {
                    descripcion: {
                      contains:
                        query.search,

                      mode:
                        "insensitive",
                    },
                  },
                  {
                    sucursal: {
                      nombre: {
                        contains:
                          query.search,

                        mode:
                          "insensitive",
                      },
                    },
                  },
                ],
              },
            ],
          }
        : {}),
    };

  const skip =
    (
      query.page -
      1
    ) *
    query.limit;

  const [
    total,
    settings,
  ] = await prisma.$transaction([
    prisma
      .configuracionSistema
      .count({
        where,
      }),

    prisma
      .configuracionSistema
      .findMany({
        where,

        skip,
        take:
          query.limit,

        orderBy: [
          {
            sucursalId:
              "asc",
          },
          {
            clave:
              "asc",
          },
        ],

        select:
          settingSelect,
      }),
  ]);

  return {
    configuraciones:
      settings.map(
        mapSetting,
      ),

    pagination: {
      page:
        query.page,

      limit:
        query.limit,

      total,

      totalPages:
        Math.max(
          1,
          Math.ceil(
            total /
              query.limit,
          ),
        ),
    },
  };
}

export async function getSettingById(
  auth: SettingAuth,
  settingId: string,
) {
  const branches =
    await getAuthorizedBranches(
      auth,
    );

  const branchIds =
    branches.map(
      (branch) =>
        branch.id,
    );

  const setting =
    await prisma
      .configuracionSistema
      .findFirst({
        where: {
          id:
            settingId,

          OR: [
            {
              sucursalId:
                null,
            },
            {
              sucursalId: {
                in:
                  branchIds,
              },
            },
          ],
        },

        select:
          settingSelect,
      });

  if (!setting) {
    throw new AppError(
      404,
      "La configuración no existe o no puedes consultarla.",
      "CONFIGURACION_NO_ENCONTRADA",
    );
  }

  return mapSetting(
    setting,
  );
}

export async function createSetting(
  auth: SettingAuth,
  input: CreateSettingInput,
) {
  const branches =
    await getAuthorizedBranches(
      auth,
    );

  if (
    input.sucursalId
  ) {
    assertAuthorizedBranch(
      branches,
      input.sucursalId,
    );
  } else if (
    auth.rol !==
    "ADMINISTRADOR_GENERAL"
  ) {
    throw new AppError(
      403,
      "Solo el administrador general puede crear configuraciones globales.",
      "CONFIGURACION_GLOBAL_NO_AUTORIZADA",
    );
  }

  if (
    !input.editable &&
    auth.rol !==
      "ADMINISTRADOR_GENERAL"
  ) {
    throw new AppError(
      403,
      "Solo el administrador general puede crear parámetros no editables.",
      "CONFIGURACION_NO_EDITABLE_NO_AUTORIZADA",
    );
  }

  assertSafeSettingKey(
    input.clave,
  );

  const uniqueKey =
    createUniqueKey(
      input.sucursalId,
      input.clave,
    );

  const existingSetting =
    await prisma
      .configuracionSistema
      .findUnique({
        where: {
          claveUnica:
            uniqueKey,
        },

        select: {
          id: true,
        },
      });

  if (existingSetting) {
    throw new AppError(
      409,
      "Ya existe una configuración con esa clave y alcance.",
      "CONFIGURACION_DUPLICADA",
    );
  }

  const normalizedValue =
    normalizeSettingValue(
      input.tipoDato,
      input.valor,
    );

  const setting =
    await prisma
      .configuracionSistema
      .create({
        data: {
          sucursalId:
            input.sucursalId,

          actualizadoPorId:
            auth.usuarioId,

          clave:
            input.clave,

          claveUnica:
            uniqueKey,

          valor:
            normalizedValue,

          tipoDato:
            input.tipoDato,

          descripcion:
            input.descripcion,

          editable:
            input.editable,
        },

        select: {
          id: true,
        },
      });

  return getSettingById(
    auth,
    setting.id,
  );
}

export async function updateSetting(
  auth: SettingAuth,
  settingId: string,
  input: UpdateSettingInput,
) {
  const currentSetting =
    await getSettingById(
      auth,
      settingId,
    );

  if (
    !currentSetting.editable
  ) {
    throw new AppError(
      409,
      "La configuración está marcada como no editable.",
      "CONFIGURACION_NO_EDITABLE",
    );
  }

  if (
    currentSetting.sucursalId ===
      null &&
    auth.rol !==
      "ADMINISTRADOR_GENERAL"
  ) {
    throw new AppError(
      403,
      "Solo el administrador general puede modificar configuraciones globales.",
      "CONFIGURACION_GLOBAL_NO_AUTORIZADA",
    );
  }

  const normalizedValue =
    normalizeSettingValue(
      currentSetting.tipoDato,
      input.valor,
    );

  await prisma
    .configuracionSistema
    .update({
      where: {
        id:
          settingId,
      },

      data: {
        valor:
          normalizedValue,

        descripcion:
          input.descripcion,

        actualizadoPorId:
          auth.usuarioId,
      },
    });

  return getSettingById(
    auth,
    settingId,
  );
}

export async function updateSettingEditability(
  auth: SettingAuth,
  settingId: string,
  input: UpdateSettingEditabilityInput,
) {
  if (
    auth.rol !==
    "ADMINISTRADOR_GENERAL"
  ) {
    throw new AppError(
      403,
      "Solo el administrador general puede cambiar la editabilidad.",
      "EDITABILIDAD_NO_AUTORIZADA",
    );
  }

  await getSettingById(
    auth,
    settingId,
  );

  await prisma
    .configuracionSistema
    .update({
      where: {
        id:
          settingId,
      },

      data: {
        editable:
          input.editable,

        actualizadoPorId:
          auth.usuarioId,
      },
    });

  return getSettingById(
    auth,
    settingId,
  );
}

export async function listCorrelatives(
  auth: SettingAuth,
  query: ListCorrelativesQuery,
) {
  const branches =
    await getAuthorizedBranches(
      auth,
    );

  assertAuthorizedBranch(
    branches,
    query.sucursalId,
  );

  const correlatives =
    await prisma.correlativo
      .findMany({
        where: {
          sucursalId:
            query.sucursalId,
        },

        select: {
          id: true,
          tipoDocumento: true,
          prefijo: true,
          ultimoNumero: true,
          longitudNumero: true,
          createdAt: true,
          updatedAt: true,
        },
      });

  const correlativeMap =
    new Map(
      correlatives.map(
        (correlative) => [
          correlative
            .tipoDocumento,

          correlative,
        ],
      ),
    );

  return {
    sucursalId:
      query.sucursalId,

    correlativos:
      DOCUMENT_TYPES.map(
        (documentType) => {
          const current =
            correlativeMap.get(
              documentType.codigo,
            );

          return {
            tipoDocumento:
              documentType.codigo,

            nombre:
              documentType.nombre,

            prefijo:
              current?.prefijo ??
              documentType
                .prefijoSugerido,

            ultimoNumero:
              current
                ? current
                    .ultimoNumero
                    .toString()
                : "0",

            longitudNumero:
              current
                ?.longitudNumero ??
              6,

            configurado:
              Boolean(current),

            proximoNumero:
              `${current?.prefijo ?? documentType.prefijoSugerido}-${(
                (
                  current
                    ?.ultimoNumero ??
                  0n
                ) +
                1n
              )
                .toString()
                .padStart(
                  current
                    ?.longitudNumero ??
                    6,
                  "0",
                )}`,

            createdAt:
              current?.createdAt
                .toISOString() ??
              null,

            updatedAt:
              current?.updatedAt
                .toISOString() ??
              null,
          };
        },
      ),
  };
}

export async function updateCorrelative(
  auth: SettingAuth,
  documentType:
    CorrelativeDocumentType,
  input: UpdateCorrelativeInput,
) {
  const branches =
    await getAuthorizedBranches(
      auth,
    );

  assertAuthorizedBranch(
    branches,
    input.sucursalId,
  );

  await prisma.correlativo.upsert({
    where: {
      sucursalId_tipoDocumento:
        {
          sucursalId:
            input.sucursalId,

          tipoDocumento:
            documentType,
        },
    },

    update: {
      prefijo:
        input.prefijo,

      longitudNumero:
        input.longitudNumero,
    },

    create: {
      sucursalId:
        input.sucursalId,

      tipoDocumento:
        documentType,

      prefijo:
        input.prefijo,

      ultimoNumero:
        0n,

      longitudNumero:
        input.longitudNumero,
    },
  });

  return listCorrelatives(
    auth,
    {
      sucursalId:
        input.sucursalId,
    },
  );
}
