import "dotenv/config";
import pg from "pg";

const checks = [
  [
    "Vendedores con más de una caja abierta",
    `SELECT count(*)::int AS count
     FROM (
       SELECT vendedor_id
       FROM caja
       WHERE estado = 'ABIERTA'
       GROUP BY vendedor_id
       HAVING count(*) > 1
     ) AS cajas_duplicadas`,
  ],
  ["Pagos de reserva con monto inválido", "SELECT count(*)::int AS count FROM pago_reserva WHERE monto <= 0"],
  ["Pagos de venta con monto inválido", "SELECT count(*)::int AS count FROM pago_venta WHERE monto <= 0"],
  [
    "Pagos electrónicos de reserva sin operación",
    "SELECT count(*)::int AS count FROM pago_reserva WHERE metodo_pago <> 'EFECTIVO' AND (numero_operacion IS NULL OR btrim(numero_operacion) = '')",
  ],
  [
    "Pagos electrónicos de venta sin operación",
    "SELECT count(*)::int AS count FROM pago_venta WHERE metodo_pago <> 'EFECTIVO' AND (numero_operacion IS NULL OR btrim(numero_operacion) = '')",
  ],
  [
    "Stock permanente inconsistente",
    "SELECT count(*)::int AS count FROM stock_permanente WHERE cantidad_actual < 0 OR cantidad_comprometida < 0 OR cantidad_comprometida > cantidad_actual",
  ],
  [
    "Stock diario inconsistente",
    "SELECT count(*)::int AS count FROM stock_diario WHERE cantidad_inicial < 0 OR cantidad_actual < 0 OR cantidad_comprometida < 0 OR cantidad_comprometida > cantidad_actual",
  ],
  [
    "Reservas con montos inconsistentes",
    "SELECT count(*)::int AS count FROM reserva WHERE total_estimado < 0 OR adelanto_requerido < 0 OR adelanto_pagado < 0 OR saldo_estimado < 0 OR adelanto_requerido > total_estimado OR adelanto_pagado > total_estimado",
  ],
  ["Gastos con monto inválido", "SELECT count(*)::int AS count FROM gasto WHERE monto <= 0"],
  [
    "Números de operación activos duplicados",
    `SELECT count(*)::int AS count
     FROM (
       SELECT upper(btrim(numero_operacion))
       FROM (
         SELECT numero_operacion
         FROM pago_reserva
         WHERE numero_operacion IS NOT NULL AND estado <> 'ANULADO'
         UNION ALL
         SELECT numero_operacion
         FROM pago_venta
         WHERE numero_operacion IS NOT NULL AND estado <> 'ANULADO'
       ) AS operaciones
       GROUP BY upper(btrim(numero_operacion))
       HAVING count(*) > 1
     ) AS duplicadas`,
  ],
];

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL es obligatoria para ejecutar el preflight.");
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  application_name: "vallecito-production-preflight",
});

await client.connect();

try {
  const failures = [];

  for (const [name, query] of checks) {
    const result = await client.query(query);
    const count = result.rows[0]?.count ?? 0;

    if (count > 0) {
      failures.push({ name, count });
    }
  }

  if (failures.length > 0) {
    console.error("El preflight detectó datos que violan invariantes:");
    for (const failure of failures) {
      console.error(`- ${failure.name}: ${failure.count}`);
    }
    process.exitCode = 1;
  } else {
    console.info("Preflight correcto: no se detectaron inconsistencias críticas.");
  }
} finally {
  await client.end();
}
