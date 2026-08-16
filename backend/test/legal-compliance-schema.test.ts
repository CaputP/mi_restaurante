import { describe, expect, it } from "vitest";
import { registerSchema } from "../src/modules/auth/auth.schema.js";
import { createConsumerClaimSchema } from "../src/modules/consumer-claims/consumer-claim.schema.js";

describe("evidencia de aceptación legal", () => {
  it("rechaza el registro de cuenta sin aceptaciones vigentes", () => {
    const result = registerSchema.safeParse({
      nombres: "JUAN", apellidos: "PEREZ", telefono: "999999999",
      correo: "juan@example.com", password: "ClaveSegura1", confirmarPassword: "ClaveSegura1",
    });
    expect(result.success).toBe(false);
  });

  it("acepta el registro con versiones vigentes", () => {
    const result = registerSchema.safeParse({
      nombres: "JUAN", apellidos: "PEREZ", telefono: "999999999",
      correo: "juan@example.com", password: "ClaveSegura1", confirmarPassword: "ClaveSegura1",
      aceptaTerminos: true, versionTerminos: "1.1-2026-08-15",
      aceptaPrivacidad: true, versionPrivacidad: "1.1-2026-08-15",
    });
    expect(result.success).toBe(true);
  });

  it("exige apoderado en reclamos de menores", () => {
    const result = createConsumerClaimSchema.safeParse({
      tipoDocumento: "DNI", numeroDocumento: "12345678", nombreCompleto: "Persona menor",
      domicilio: "Cusco, Perú", correo: "familia@example.com", esMenorEdad: true,
      tipo: "RECLAMO", bienContratado: "SERVICIO", descripcionBien: "Reserva de evento",
      detalle: "Detalle suficiente del reclamo presentado.", pedidoConsumidor: "Solicito una respuesta formal.",
      canalRespuesta: "CORREO", aceptaPrivacidad: true, versionPrivacidad: "1.1-2026-08-15",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some(({ path }) => path.includes("nombreApoderado"))).toBe(true);
  });
});
