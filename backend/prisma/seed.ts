
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import {
  PrismaClient,
  TipoDocumentoCorrelativo,
} from "../src/generated/prisma/client.ts";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("No se encontró DATABASE_URL en el archivo .env");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

const roles = [
  {
    codigo: "ADMINISTRADOR_GENERAL",
    nombre: "Administrador general",
    descripcion: "Administra todas las sucursales y configuraciones del sistema.",
  },
  {
    codigo: "ADMINISTRADOR_SUCURSAL",
    nombre: "Administrador de sucursal",
    descripcion: "Administra las operaciones de una sucursal.",
  },
  {
    codigo: "VENDEDOR",
    nombre: "Vendedor",
    descripcion: "Registra pedidos, ventas y operaciones de caja autorizadas.",
  },
  {
    codigo: "MOZO",
    nombre: "Mozo",
    descripcion: "Gestiona el retiro y la entrega de pedidos.",
  },
  {
    codigo: "COCINA",
    nombre: "Cocina",
    descripcion: "Gestiona la preparación de comandas.",
  },
  {
    codigo: "CLIENTE",
    nombre: "Cliente",
    descripcion: "Realiza reservas y consulta su historial.",
  },
] as const;

const permisos = [
  ["DASHBOARD_VER", "Ver dashboard", "DASHBOARD"],

  ["SUCURSAL_GESTIONAR", "Gestionar sucursales", "SUCURSALES"],
  ["ZONA_GESTIONAR", "Gestionar zonas", "SUCURSALES"],

  ["USUARIO_GESTIONAR", "Gestionar usuarios", "USUARIOS"],
  ["ROL_GESTIONAR", "Gestionar roles y permisos", "USUARIOS"],

  ["PRODUCTO_GESTIONAR", "Gestionar productos", "PRODUCTOS"],
  ["INVENTARIO_VER", "Consultar inventario", "INVENTARIO"],
  ["INVENTARIO_AJUSTAR", "Registrar movimientos de inventario", "INVENTARIO"],

  ["RESERVA_CREAR", "Crear reservas", "RESERVAS"],
  ["RESERVA_APROBAR", "Aprobar reservas", "RESERVAS"],
  ["RESERVA_CANCELAR", "Cancelar reservas", "RESERVAS"],

  ["PEDIDO_VER", "Consultar pedidos", "PEDIDOS"],
  ["PEDIDO_CREAR", "Crear pedidos", "PEDIDOS"],
  ["PEDIDO_MODIFICAR", "Modificar pedidos abiertos", "PEDIDOS"],

  ["COMANDA_VER", "Consultar comandas", "COCINA"],
  ["COMANDA_PROCESAR", "Procesar comandas", "COCINA"],
  ["ENTREGA_REGISTRAR", "Registrar entregas", "ENTREGAS"],

  ["CAJA_ABRIR", "Abrir caja", "CAJA"],
  ["CAJA_CERRAR", "Cerrar caja", "CAJA"],

  ["VENTA_CREAR", "Registrar ventas", "VENTAS"],
  ["VENTA_ANULAR", "Anular ventas", "VENTAS"],

  ["GASTO_REGISTRAR", "Registrar gastos", "GASTOS"],
  ["REPORTE_VER", "Consultar reportes", "REPORTES"],

  ["FIDELIZACION_GESTIONAR", "Gestionar fidelización", "FIDELIZACION"],
  ["PROMOCION_GESTIONAR", "Gestionar promociones", "PROMOCIONES"],

  ["CONFIGURACION_GESTIONAR", "Gestionar configuraciones", "CONFIGURACION"],
  ["AUDITORIA_VER", "Consultar auditoría", "AUDITORIA"],
  ["RESPALDO_GESTIONAR", "Gestionar respaldos", "RESPALDOS"],

  ["CLIENTE_HISTORIAL_VER", "Consultar historial personal", "CLIENTES"],
  ["CLIENTE_PREMIOS_VER", "Consultar premios personales", "CLIENTES"],
] as const;

const permisosPorRol: Record<string, string[]> = {
  ADMINISTRADOR_GENERAL: permisos.map(([codigo]) => codigo),

  ADMINISTRADOR_SUCURSAL: permisos
    .map(([codigo]) => codigo)
    .filter(
      (codigo) =>
        !["ROL_GESTIONAR", "RESPALDO_GESTIONAR"].includes(codigo),
    ),

  VENDEDOR: [
    "DASHBOARD_VER",
    "INVENTARIO_VER",
    "RESERVA_CREAR",
    "PEDIDO_VER",
    "PEDIDO_CREAR",
    "PEDIDO_MODIFICAR",
    "CAJA_ABRIR",
    "VENTA_CREAR",
  ],

  MOZO: [
    "DASHBOARD_VER",
    "PEDIDO_VER",
    "ENTREGA_REGISTRAR",
  ],

  COCINA: [
    "DASHBOARD_VER",
    "COMANDA_VER",
    "COMANDA_PROCESAR",
  ],

  CLIENTE: [
    "RESERVA_CREAR",
    "RESERVA_CANCELAR",
    "CLIENTE_HISTORIAL_VER",
    "CLIENTE_PREMIOS_VER",
  ],
};

async function seedRolesYPermisos(): Promise<void> {
  for (const rol of roles) {
    await prisma.rol.upsert({
      where: {
        codigo: rol.codigo,
      },
      update: {
        nombre: rol.nombre,
        descripcion: rol.descripcion,
        activo: true,
      },
      create: {
        codigo: rol.codigo,
        nombre: rol.nombre,
        descripcion: rol.descripcion,
      },
    });
  }

  for (const [codigo, nombre, modulo] of permisos) {
    await prisma.permiso.upsert({
      where: {
        codigo,
      },
      update: {
        nombre,
        modulo,
        activo: true,
      },
      create: {
        codigo,
        nombre,
        modulo,
      },
    });
  }

  const rolesGuardados = await prisma.rol.findMany();
  const permisosGuardados = await prisma.permiso.findMany();

  const rolPorCodigo = new Map(
    rolesGuardados.map((rol) => [rol.codigo, rol.id]),
  );

  const permisoPorCodigo = new Map(
    permisosGuardados.map((permiso) => [permiso.codigo, permiso.id]),
  );

  const asignaciones: Array<{
    rolId: string;
    permisoId: string;
  }> = [];

  for (const [codigoRol, codigosPermiso] of Object.entries(
    permisosPorRol,
  )) {
    const rolId = rolPorCodigo.get(codigoRol);

    if (!rolId) {
      throw new Error(`No se encontró el rol ${codigoRol}`);
    }

    for (const codigoPermiso of codigosPermiso) {
      const permisoId = permisoPorCodigo.get(codigoPermiso);

      if (!permisoId) {
        throw new Error(`No se encontró el permiso ${codigoPermiso}`);
      }

      asignaciones.push({
        rolId,
        permisoId,
      });
    }
  }

  await prisma.rolPermiso.createMany({
    data: asignaciones,
    skipDuplicates: true,
  });
}

async function seedSucursal(): Promise<string> {
  const sucursal = await prisma.sucursal.upsert({
    where: {
      codigo: "SUC-001",
    },
    update: {
      nombre: "El Vallecito de Chocco - Santiago",
      direccion: "Chocco, Santiago - Cusco",
      telefono: null,
      correo: null,
      zonaHoraria: "America/Lima",
      estado: "ACTIVO",
    },
    create: {
      codigo: "SUC-001",
      nombre: "El Vallecito de Chocco - Santiago",
      direccion: "Chocco, Santiago - Cusco",
      zonaHoraria: "America/Lima",
      estado: "ACTIVO",
    },
  });

  const zonas = [
    {
      nombre: "Salón principal",
      descripcion: "Zona principal de atención del restaurante.",
    },
    {
      nombre: "Zona de árboles",
      descripcion: "Espacio natural ubicado junto a los árboles.",
    },
    {
      nombre: "Zona de troncos",
      descripcion: "Zona campestre equipada con asientos de troncos.",
    },
    {
      nombre: "Cancha",
      descripcion: "Espacio amplio para reservas y eventos.",
    },
    {
      nombre: "Parque",
      descripcion: "Zona abierta y recreativa.",
    },
  ];

  for (const zona of zonas) {
    await prisma.zona.upsert({
      where: {
        sucursalId_nombre: {
          sucursalId: sucursal.id,
          nombre: zona.nombre,
        },
      },
      update: {
        descripcion: zona.descripcion,
        estado: "ACTIVO",
      },
      create: {
        sucursalId: sucursal.id,
        nombre: zona.nombre,
        descripcion: zona.descripcion,
        estado: "ACTIVO",
      },
    });
  }

  return sucursal.id;
}

async function seedCatalogos(): Promise<void> {
  const unidades = [
    ["UNIDAD", "Unidad", "und", 0],
    ["KILOGRAMO", "Kilogramo", "kg", 3],
    ["GRAMO", "Gramo", "g", 3],
    ["LITRO", "Litro", "l", 3],
    ["MILILITRO", "Mililitro", "ml", 3],
    ["BOTELLA", "Botella", "bot", 0],
    ["CAJA", "Caja", "cja", 0],
    ["PAQUETE", "Paquete", "paq", 0],
  ] as const;

  for (const [codigo, nombre, abreviatura, decimales] of unidades) {
    await prisma.unidadMedida.upsert({
      where: {
        codigo,
      },
      update: {
        nombre,
        abreviatura,
        decimales,
        activo: true,
      },
      create: {
        codigo,
        nombre,
        abreviatura,
        decimales,
      },
    });
  }

  const categorias = [
    "Platos",
    "Bebidas",
    "Gaseosas",
    "Cervezas",
    "Adicionales",
  ];

  for (const nombre of categorias) {
    await prisma.categoria.upsert({
      where: {
        nombre,
      },
      update: {
        estado: "ACTIVO",
      },
      create: {
        nombre,
        estado: "ACTIVO",
      },
    });
  }

  const categoriasGasto = [
    "Gas",
    "Insumos",
    "Transporte",
    "Limpieza",
    "Mantenimiento",
    "Servicios",
    "Otros",
  ];

  for (const nombre of categoriasGasto) {
    await prisma.categoriaGasto.upsert({
      where: {
        nombre,
      },
      update: {
        activo: true,
      },
      create: {
        nombre,
      },
    });
  }
}

async function seedCorrelativos(sucursalId: string): Promise<void> {
  const correlativos = [
    [TipoDocumentoCorrelativo.RESERVA, "R"],
    [TipoDocumentoCorrelativo.PEDIDO, "P"],
    [TipoDocumentoCorrelativo.COMANDA, "C"],
    [TipoDocumentoCorrelativo.TICKET, "T"],
    [TipoDocumentoCorrelativo.CAJA, "CJ"],
    [TipoDocumentoCorrelativo.GASTO, "G"],
  ] as const;

  for (const [tipoDocumento, prefijo] of correlativos) {
    await prisma.correlativo.upsert({
      where: {
        sucursalId_tipoDocumento: {
          sucursalId,
          tipoDocumento,
        },
      },
      update: {
        prefijo,
        longitudNumero: 6,
      },
      create: {
        sucursalId,
        tipoDocumento,
        prefijo,
        ultimoNumero: 0n,
        longitudNumero: 6,
      },
    });
  }
}

async function seedAdministrador(sucursalId: string): Promise<void> {
  const correo = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const nombres = process.env.ADMIN_NOMBRES?.trim();
  const apellidos = process.env.ADMIN_APELLIDOS?.trim();
  const telefono = process.env.ADMIN_TELEFONO?.trim() || null;

  if (!correo || !password || !nombres || !apellidos) {
    console.warn(
      "No se creó el administrador: faltan variables ADMIN_* en .env.",
    );
    return;
  }

  if (password.length < 10) {
    throw new Error(
      "ADMIN_PASSWORD debe tener como mínimo 10 caracteres.",
    );
  }

  const rolAdministrador = await prisma.rol.findUnique({
    where: {
      codigo: "ADMINISTRADOR_GENERAL",
    },
  });

  if (!rolAdministrador) {
    throw new Error(
      "No se encontró el rol ADMINISTRADOR_GENERAL.",
    );
  }

  let administrador = await prisma.usuario.findUnique({
    where: {
      correo,
    },
  });

  if (!administrador) {
    const passwordHash = await hash(password, 12);

    administrador = await prisma.usuario.create({
      data: {
        rolId: rolAdministrador.id,
        nombres,
        apellidos,
        telefono,
        correo,
        passwordHash,
        proveedorAuth: "LOCAL",
        estado: "ACTIVO",
        correoVerificado: true,
      },
    });

    console.log(`Administrador creado: ${correo}`);
  } else {
    administrador = await prisma.usuario.update({
      where: {
        id: administrador.id,
      },
      data: {
        rolId: rolAdministrador.id,
        nombres,
        apellidos,
        telefono,
        estado: "ACTIVO",
      },
    });

    console.log(`Administrador existente actualizado: ${correo}`);
  }

  await prisma.usuarioSucursal.upsert({
    where: {
      usuarioId_sucursalId: {
        usuarioId: administrador.id,
        sucursalId,
      },
    },
    update: {
      activo: true,
      fechaFin: null,
    },
    create: {
      usuarioId: administrador.id,
      sucursalId,
      activo: true,
    },
  });
}

async function main(): Promise<void> {
  console.log("Iniciando datos iniciales...");

  await seedRolesYPermisos();

  const sucursalId = await seedSucursal();

  await seedCatalogos();
  await seedCorrelativos(sucursalId);
  await seedAdministrador(sucursalId);

  console.log("Datos iniciales creados correctamente.");
}



main()
  .catch((error: unknown) => {
    console.error("No se pudo ejecutar el seed:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });