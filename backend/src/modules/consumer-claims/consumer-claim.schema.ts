import { z } from "zod";
import { PRIVACY_VERSION } from "../../shared/legal/legal-versions.js";

const uuid = z.string().uuid("El identificador no es válido.");
const requiredText = (min: number, max: number, label: string) =>
  z.string().trim().min(min, `${label} es obligatorio.`).max(max, `${label} es demasiado largo.`);
const optionalText = (max: number) =>
  z.union([z.string().trim().max(max), z.literal(""), z.null()]).optional()
    .transform((value) => value || null);

export const createConsumerClaimSchema = z.object({
  sucursalId: z.union([uuid, z.literal(""), z.null()]).optional()
    .transform((value) => value || null),
  tipoDocumento: z.enum(["DNI", "CE", "PASAPORTE", "RUC", "OTRO"]),
  numeroDocumento: requiredText(4, 20, "El número de documento"),
  nombreCompleto: requiredText(3, 200, "El nombre completo"),
  domicilio: requiredText(5, 300, "El domicilio"),
  telefono: optionalText(30),
  correo: z.string().trim().toLowerCase().email("El correo no es válido.").max(160),
  esMenorEdad: z.boolean().optional().default(false),
  nombreApoderado: optionalText(200),
  tipo: z.enum(["RECLAMO", "QUEJA"]),
  bienContratado: z.enum(["PRODUCTO", "SERVICIO"]),
  descripcionBien: requiredText(3, 300, "La descripción del bien o servicio"),
  montoReclamado: z.union([
    z.coerce.number().finite().min(0).max(999999999.99),
    z.literal(""),
    z.null(),
  ]).optional().transform((value) => value === "" || value === undefined ? null : value),
  detalle: requiredText(10, 5000, "El detalle"),
  pedidoConsumidor: requiredText(5, 3000, "El pedido del consumidor"),
  canalRespuesta: z.enum(["CORREO", "TELEFONO", "DOMICILIO"]),
  aceptaPrivacidad: z.literal(true, {
    error: "Debes aceptar la Política de Privacidad para enviar el reclamo.",
  }),
  versionPrivacidad: z.literal(PRIVACY_VERSION, {
    error: "La versión de la Política de Privacidad no es válida.",
  }),
}).superRefine((data, context) => {
  if (data.esMenorEdad && !data.nombreApoderado) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "El nombre del padre, madre o apoderado es obligatorio.",
      path: ["nombreApoderado"],
    });
  }
});

export const receiptParamsSchema = z.object({
  codigo: z.string().trim().min(8).max(30),
});

export const receiptQuerySchema = z.object({
  token: z.string().trim().min(30).max(200),
});

export const listConsumerClaimsSchema = z.object({
  search: z.string().trim().max(200).optional().default(""),
  estado: z.enum(["TODOS", "RECIBIDO", "EN_REVISION", "RESPONDIDO", "CERRADO"]).optional().default("TODOS"),
  sucursalId: z.union([uuid, z.literal("")]).optional().transform((value) => value || undefined),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const consumerClaimIdSchema = z.object({ id: uuid });

export const updateConsumerClaimSchema = z.object({
  estado: z.enum(["EN_REVISION", "RESPONDIDO", "CERRADO"]),
  respuesta: optionalText(5000),
  medidasAdoptadas: optionalText(5000),
}).superRefine((data, context) => {
  if (data.estado === "RESPONDIDO" && !data.respuesta) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "La respuesta es obligatoria para marcar el reclamo como respondido.",
      path: ["respuesta"],
    });
  }
});

export type CreateConsumerClaimInput = z.infer<typeof createConsumerClaimSchema>;
export type ListConsumerClaimsInput = z.infer<typeof listConsumerClaimsSchema>;
export type UpdateConsumerClaimInput = z.infer<typeof updateConsumerClaimSchema>;
