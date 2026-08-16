import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { Prisma } from "../../generated/prisma/client.js";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";
import { sendMail } from "../../lib/mailer.js";
import { AppError } from "../../shared/errors/app-error.js";
import type {
  CreateConsumerClaimInput,
  ListConsumerClaimsInput,
  UpdateConsumerClaimInput,
} from "./consumer-claim.schema.js";

type ClaimAuth = { usuarioId: string; rol: string };

const claimSelect = {
  id: true,
  codigo: true,
  sucursalId: true,
  tipoDocumento: true,
  numeroDocumento: true,
  nombreCompleto: true,
  domicilio: true,
  telefono: true,
  correo: true,
  esMenorEdad: true,
  nombreApoderado: true,
  tipo: true,
  bienContratado: true,
  descripcionBien: true,
  montoReclamado: true,
  detalle: true,
  pedidoConsumidor: true,
  canalRespuesta: true,
  estado: true,
  respuesta: true,
  medidasAdoptadas: true,
  respondidoAt: true,
  createdAt: true,
  updatedAt: true,
  sucursal: { select: { id: true, nombre: true, direccion: true } },
  respondidoPor: { select: { id: true, nombres: true, apellidos: true } },
} satisfies Prisma.ReclamoConsumidorSelect;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character] ?? character);
}

async function notifySafely(input: Parameters<typeof sendMail>[0], codigo: string) {
  try {
    await sendMail(input);
  } catch (error) {
    logger.error({ error, codigo }, "No se pudo enviar el correo del Libro de Reclamaciones");
  }
}

async function getAuthorizedWhere(auth: ClaimAuth): Promise<Prisma.ReclamoConsumidorWhereInput> {
  if (auth.rol === "ADMINISTRADOR_GENERAL") {
    return {};
  }

  const assignments = await prisma.usuarioSucursal.findMany({
    where: { usuarioId: auth.usuarioId, activo: true },
    select: { sucursalId: true },
  });

  return { sucursalId: { in: assignments.map((item) => item.sucursalId) } };
}

export async function getConsumerClaimOptions() {
  return prisma.sucursal.findMany({
    where: { estado: "ACTIVO" },
    select: { id: true, nombre: true, direccion: true },
    orderBy: { nombre: "asc" },
  });
}

export async function createConsumerClaim(input: CreateConsumerClaimInput) {
  if (input.sucursalId) {
    const branch = await prisma.sucursal.findFirst({
      where: { id: input.sucursalId, estado: "ACTIVO" }, select: { id: true },
    });
    if (!branch) throw new AppError(400, "La sede seleccionada no es válida.", "SUCURSAL_INVALIDA");
  }

  const token = randomBytes(32).toString("base64url");
  const sequenceResult = await prisma.$queryRaw<Array<{ numero: bigint }>>`
    SELECT nextval('reclamo_consumidor_numero_seq') AS numero
  `;
  const sequenceNumber = sequenceResult[0]?.numero;

  if (sequenceNumber === undefined) {
    throw new AppError(
      500,
      "No se pudo asignar la numeración del Libro de Reclamaciones.",
      "NUMERACION_RECLAMO_NO_DISPONIBLE",
    );
  }

  const year = new Intl.DateTimeFormat("en", {
    timeZone: "America/Lima",
    year: "numeric",
  }).format(new Date());
  const codigo = `LR-${year}-${sequenceNumber.toString().padStart(8, "0")}`;
  const record = await prisma.reclamoConsumidor.create({
    data: {
      codigo,
      tokenConsultaHash: hashToken(token),
      sucursalId: input.sucursalId,
      tipoDocumento: input.tipoDocumento,
      numeroDocumento: input.numeroDocumento,
      nombreCompleto: input.nombreCompleto,
      domicilio: input.domicilio,
      telefono: input.telefono,
      correo: input.correo,
      esMenorEdad: input.esMenorEdad,
      nombreApoderado: input.nombreApoderado,
      tipo: input.tipo,
      bienContratado: input.bienContratado,
      descripcionBien: input.descripcionBien,
      montoReclamado: input.montoReclamado,
      detalle: input.detalle,
      pedidoConsumidor: input.pedidoConsumidor,
      canalRespuesta: input.canalRespuesta,
      privacidadVersion: input.versionPrivacidad,
      privacidadAceptadaAt: new Date(),
    },
    select: claimSelect,
  });

  const receiptUrl = `${env.FRONTEND_URL}/libro-de-reclamaciones?codigo=${encodeURIComponent(codigo)}&token=${encodeURIComponent(token)}`;
  void notifySafely({
    to: input.correo,
    subject: `Constancia del Libro de Reclamaciones ${codigo}`,
    text: `El Vallecito de Chocco ha recibido tu ${input.tipo.toLowerCase()} con código ${codigo}. Conserva esta constancia: ${receiptUrl}`,
    html: `<p><strong>El Vallecito de Chocco</strong> ha recibido tu ${escapeHtml(input.tipo.toLowerCase())}.</p><p><strong>Código:</strong> ${escapeHtml(codigo)}</p><p><a href="${escapeHtml(receiptUrl)}">Consultar e imprimir constancia</a></p><p>El plazo máximo de respuesta es de 15 días hábiles.</p>`,
  }, codigo);

  void notifySafely({
    to: env.CONSUMER_CLAIMS_NOTIFICATION_EMAIL,
    subject: `Nuevo ${input.tipo.toLowerCase()} ${codigo}`,
    text: [
      `Se registró el ${input.tipo.toLowerCase()} ${codigo}.`,
      `Consumidor: ${input.nombreCompleto}`,
      `Correo: ${input.correo}`,
      `Detalle: ${input.detalle}`,
      `Gestionar: ${env.FRONTEND_URL}/admin/reclamaciones`,
    ].join("\n"),
    html: `<p>Se registró el <strong>${escapeHtml(input.tipo.toLowerCase())} ${escapeHtml(codigo)}</strong>.</p><p><strong>Consumidor:</strong> ${escapeHtml(input.nombreCompleto)}<br><strong>Correo:</strong> ${escapeHtml(input.correo)}</p><p><strong>Detalle:</strong> ${escapeHtml(input.detalle)}</p><p><a href="${escapeHtml(`${env.FRONTEND_URL}/admin/reclamaciones`)}">Abrir bandeja de atención</a></p>`,
  }, codigo);

  return { reclamo: record, tokenConsulta: token, urlConstancia: receiptUrl };
}

export async function getConsumerClaimReceipt(codigo: string, token: string) {
  const record = await prisma.reclamoConsumidor.findUnique({
    where: { codigo }, select: { ...claimSelect, tokenConsultaHash: true },
  });
  const providedHash = Buffer.from(hashToken(token), "hex");
  const storedHash = record ? Buffer.from(record.tokenConsultaHash, "hex") : randomBytes(32);

  if (!record || storedHash.length !== providedHash.length || !timingSafeEqual(storedHash, providedHash)) {
    throw new AppError(404, "No se encontró una constancia válida.", "CONSTANCIA_NO_ENCONTRADA");
  }

  const { tokenConsultaHash: _secret, ...receipt } = record;
  return receipt;
}

export async function listConsumerClaims(auth: ClaimAuth, input: ListConsumerClaimsInput) {
  const authorized = await getAuthorizedWhere(auth);
  const where: Prisma.ReclamoConsumidorWhereInput = {
    AND: [
      authorized,
      input.sucursalId ? { sucursalId: input.sucursalId } : {},
      input.estado !== "TODOS" ? { estado: input.estado } : {},
      input.search ? {
        OR: [
          { codigo: { contains: input.search, mode: "insensitive" } },
          { nombreCompleto: { contains: input.search, mode: "insensitive" } },
          { numeroDocumento: { contains: input.search, mode: "insensitive" } },
        ],
      } : {},
    ],
  };
  const [items, total] = await prisma.$transaction([
    prisma.reclamoConsumidor.findMany({
      where, select: claimSelect, orderBy: { createdAt: "desc" },
      skip: (input.page - 1) * input.limit, take: input.limit,
    }),
    prisma.reclamoConsumidor.count({ where }),
  ]);
  return { items, pagination: { page: input.page, limit: input.limit, total, totalPages: Math.ceil(total / input.limit) } };
}

export async function getConsumerClaim(auth: ClaimAuth, id: string) {
  const authorized = await getAuthorizedWhere(auth);
  const record = await prisma.reclamoConsumidor.findFirst({ where: { AND: [{ id }, authorized] }, select: claimSelect });
  if (!record) throw new AppError(404, "El reclamo no existe o no está disponible.", "RECLAMO_NO_ENCONTRADO");
  return record;
}

export async function updateConsumerClaim(auth: ClaimAuth, id: string, input: UpdateConsumerClaimInput) {
  await getConsumerClaim(auth, id);
  const responded = input.estado === "RESPONDIDO";
  const record = await prisma.reclamoConsumidor.update({
    where: { id },
    data: {
      estado: input.estado,
      respuesta: input.respuesta,
      medidasAdoptadas: input.medidasAdoptadas,
      ...(responded
        ? {
          respondidoAt: new Date(),
          respondidoPorId: auth.usuarioId,
        }
        : {}),
    },
    select: claimSelect,
  });

  if (responded && record.respuesta) {
    void notifySafely({
      to: record.correo,
      subject: `Respuesta a tu reclamo ${record.codigo}`,
      text: `Respuesta: ${record.respuesta}\n\nMedidas adoptadas: ${record.medidasAdoptadas ?? "No aplica"}`,
      html: `<p><strong>Respuesta a ${escapeHtml(record.codigo)}:</strong></p><p>${escapeHtml(record.respuesta)}</p><p><strong>Medidas adoptadas:</strong> ${escapeHtml(record.medidasAdoptadas ?? "No aplica")}</p>`,
    }, record.codigo);
  }

  return record;
}
