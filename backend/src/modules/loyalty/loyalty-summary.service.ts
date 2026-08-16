import {
  Prisma,
} from "../../generated/prisma/client.js";

import {
  prisma,
} from "../../lib/prisma.js";

type LoyaltySummaryRow = {
  visitasAcumuladas:
    number | bigint;

  montoAcumulado:
    Prisma.Decimal | string | number | null;
};

/**
 * Resume movimientos por venta antes de sumar. Una misma venta genera un
 * movimiento por cada programa aplicable, por lo que sumar los progresos
 * duplicaría visitas y consumo cuando existen varios programas activos.
 */
export async function getClientLoyaltySummary(
  clientId: string,
) {
  const rows =
    await prisma.$queryRaw<
      LoyaltySummaryRow[]
    >`
      SELECT
        COUNT(
          DISTINCT CASE
            WHEN "venta_cliente"."visitasAplicadas" > 0
            THEN (
              "venta_cliente"."createdAt"
              AT TIME ZONE 'America/Lima'
            )::date
          END
        )::integer AS "visitasAcumuladas",
        COALESCE(
          SUM("venta_cliente"."montoAplicado"),
          0
        )::numeric AS "montoAcumulado"
      FROM (
        SELECT
          "movimiento"."venta_id" AS "ventaId",
          MAX("movimiento"."visitas_aplicadas") AS "visitasAplicadas",
          MAX("movimiento"."monto_aplicado") AS "montoAplicado",
          "venta"."created_at" AS "createdAt"
        FROM "movimiento_fidelizacion" AS "movimiento"
        INNER JOIN "venta"
          ON "venta"."id" = "movimiento"."venta_id"
        WHERE
          "movimiento"."cliente_id" = ${clientId}::uuid
          AND "movimiento"."estado" = 'ACTIVO'
          AND "venta"."estado" = 'CONFIRMADA'
        GROUP BY
          "movimiento"."venta_id",
          "venta"."created_at"
      ) AS "venta_cliente"
    `;

  const summary =
    rows[0];

  return {
    visitasAcumuladas:
      Number(
        summary
          ?.visitasAcumuladas ??
        0,
      ),

    montoAcumulado:
      Number(
        summary
          ?.montoAcumulado ??
        0,
      ),
  };
}
