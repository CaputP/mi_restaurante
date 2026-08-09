import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

import type {
  ReportSummaryQuery,
} from "./report.schema.js";
import {
  getReportSummary,
} from "./report.service.js";

type ReportAuth = {
  usuarioId: string;
  rol: string;
};

function money(value: number): string {
  return new Intl.NumberFormat(
    "es-PE",
    {
      style: "currency",
      currency: "PEN",
    },
  ).format(value);
}

function label(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(
      /(^|\s)\S/g,
      (character) =>
        character.toUpperCase(),
    );
}

function styleHeader(
  row: ExcelJS.Row,
): void {
  row.font = {
    bold: true,
    color: {
      argb: "FFFFFFFF",
    },
  };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: "FF355E3B",
    },
  };
  row.alignment = {
    vertical: "middle",
  };
}

function fitColumns(
  worksheet: ExcelJS.Worksheet,
): void {
  worksheet.columns.forEach(
    (column) => {
      let maximum = 12;

      column.eachCell?.(
        {
          includeEmpty: true,
        },
        (cell) => {
          maximum = Math.min(
            42,
            Math.max(
              maximum,
              String(
                cell.value ?? "",
              ).length + 2,
            ),
          );
        },
      );

      column.width = maximum;
    },
  );
}

export async function createReportWorkbook(
  auth: ReportAuth,
  query: ReportSummaryQuery,
): Promise<Buffer> {
  const report =
    await getReportSummary(
      auth,
      query,
    );

  const workbook =
    new ExcelJS.Workbook();
  workbook.creator =
    "El Vallecito de Chocco";
  workbook.created = new Date();
  workbook.modified = new Date();

  const summary =
    workbook.addWorksheet(
      "Resumen",
      {
        views: [
          {
            state: "frozen",
            ySplit: 1,
          },
        ],
      },
    );

  summary.addRow([
    "Indicador",
    "Valor",
  ]);
  styleHeader(summary.getRow(1));

  for (
    const [key, value]
    of Object.entries(
      report.resumen,
    )
  ) {
    const row = summary.addRow([
      label(key),
      value,
    ]);

    if (
      [
        "subtotal",
        "descuentos",
        "propinas",
        "totalVendido",
        "adelantosAplicados",
        "adelantosRecibidos",
        "cobradoEnCaja",
        "totalGastos",
        "balanceOperativo",
        "ticketPromedio",
        "diferenciaCaja",
      ].includes(key)
    ) {
      row.getCell(2).numFmt =
        '"S/ "#,##0.00';
    }
  }

  summary.addRow([]);
  summary.addRow([
    "Periodo",
    `${report.filtros.fechaDesde} a ${report.filtros.fechaHasta}`,
  ]);
  fitColumns(summary);

  const daily =
    workbook.addWorksheet(
      "Serie diaria",
    );
  daily.addRow([
    "Fecha",
    "Ventas",
    "Gastos",
    "Balance",
  ]);
  styleHeader(daily.getRow(1));
  report.serieDiaria.forEach(
    (item) => {
      const row = daily.addRow([
        item.fecha,
        item.ventas,
        item.gastos,
        item.balance,
      ]);
      row.getCell(2).numFmt =
        '"S/ "#,##0.00';
      row.getCell(3).numFmt =
        '"S/ "#,##0.00';
      row.getCell(4).numFmt =
        '"S/ "#,##0.00';
    },
  );
  fitColumns(daily);

  const payments =
    workbook.addWorksheet(
      "Métodos de pago",
    );
  payments.addRow([
    "Método",
    "Ventas",
    "Adelantos de reservas",
    "Total",
  ]);
  styleHeader(payments.getRow(1));
  report.metodosPago.forEach(
    (item) => {
      const row = payments.addRow([
        label(item.metodoPago),
        item.ventas,
        item.adelantos,
        item.total,
      ]);
      row.getCell(2).numFmt =
        '"S/ "#,##0.00';
      row.getCell(3).numFmt =
        '"S/ "#,##0.00';
      row.getCell(4).numFmt =
        '"S/ "#,##0.00';
    },
  );
  fitColumns(payments);

  const products =
    workbook.addWorksheet(
      "Productos",
    );
  products.addRow([
    "Posición",
    "Producto",
    "Cantidad",
    "Total",
    "Registros",
  ]);
  styleHeader(products.getRow(1));
  report.productosMasVendidos.forEach(
    (item) => {
      const row = products.addRow([
        item.posicion,
        item.nombreProducto,
        item.cantidad,
        item.total,
        item.registros,
      ]);
      row.getCell(4).numFmt =
        '"S/ "#,##0.00';
    },
  );
  fitColumns(products);

  const states =
    workbook.addWorksheet(
      "Estados operativos",
    );
  states.addRow([
    "Módulo",
    "Estado",
    "Cantidad",
  ]);
  styleHeader(states.getRow(1));
  report.estadosPedidos.forEach(
    (item) => {
      states.addRow([
        "Pedidos",
        label(item.estado),
        item.cantidad,
      ]);
    },
  );
  report.estadosReservas.forEach(
    (item) => {
      states.addRow([
        "Reservas",
        label(item.estado),
        item.cantidad,
      ]);
    },
  );
  fitColumns(states);

  const data =
    await workbook.xlsx.writeBuffer();

  return Buffer.from(data);
}

export async function createReportPdf(
  auth: ReportAuth,
  query: ReportSummaryQuery,
): Promise<Buffer> {
  const report =
    await getReportSummary(
      auth,
      query,
    );

  return new Promise<Buffer>(
    (resolve, reject) => {
      const document =
        new PDFDocument({
          size: "A4",
          margin: 46,
          info: {
            Title:
              "Reporte operativo - El Vallecito de Chocco",
            Author:
              "El Vallecito de Chocco",
          },
        });

      const chunks: Buffer[] = [];
      document.on(
        "data",
        (chunk: Buffer) =>
          chunks.push(chunk),
      );
      document.on(
        "end",
        () =>
          resolve(
            Buffer.concat(chunks),
          ),
      );
      document.on(
        "error",
        reject,
      );

      document
        .fillColor("#355e3b")
        .fontSize(20)
        .text(
          "El Vallecito de Chocco",
        );
      document
        .fillColor("#263d2a")
        .fontSize(15)
        .text(
          "Reporte operativo",
        );
      document
        .moveDown(0.3)
        .fillColor("#657269")
        .fontSize(9)
        .text(
          `Periodo: ${report.filtros.fechaDesde} a ${report.filtros.fechaHasta}`,
        )
        .text(
          `Generado: ${new Intl.DateTimeFormat("es-PE", {
            timeZone: "America/Lima",
            dateStyle: "short",
            timeStyle: "short",
          }).format(new Date())}`,
        );

      document.moveDown(1.2);

      const metrics = [
        [
          "Total vendido",
          money(
            report.resumen.totalVendido,
          ),
        ],
        [
          "Adelantos recibidos",
          money(
            report.resumen.adelantosRecibidos,
          ),
        ],
        [
          "Gastos",
          money(
            report.resumen.totalGastos,
          ),
        ],
        [
          "Balance operativo",
          money(
            report.resumen.balanceOperativo,
          ),
        ],
        [
          "Ventas confirmadas",
          String(
            report.resumen.ventasConfirmadas,
          ),
        ],
        [
          "Ticket promedio",
          money(
            report.resumen.ticketPromedio,
          ),
        ],
        [
          "Diferencia de caja",
          money(
            report.resumen.diferenciaCaja,
          ),
        ],
      ] as const;

      for (const [name, value] of metrics) {
        const y = document.y;
        document
          .roundedRect(
            46,
            y,
            500,
            28,
            5,
          )
          .fill("#f2f6f2");
        document
          .fillColor("#536057")
          .fontSize(9)
          .text(name, 56, y + 9);
        document
          .fillColor("#263d2a")
          .fontSize(10)
          .text(
            value,
            350,
            y + 8,
            {
              width: 185,
              align: "right",
            },
          );
        document.y = y + 34;
      }

      document
        .moveDown(0.6)
        .fillColor("#355e3b")
        .fontSize(12)
        .text("Métodos de pago");
      document.moveDown(0.35);

      report.metodosPago.forEach(
        (item) => {
          document
            .fillColor("#536057")
            .fontSize(9)
            .text(
              `${label(item.metodoPago)}: ${money(item.total)}`,
            );
        },
      );

      document
        .moveDown(0.9)
        .fillColor("#355e3b")
        .fontSize(12)
        .text(
          "Productos más vendidos",
        );
      document.moveDown(0.35);

      if (
        report.productosMasVendidos.length ===
        0
      ) {
        document
          .fillColor("#657269")
          .fontSize(9)
          .text(
            "No existen ventas de productos en el periodo.",
          );
      } else {
        report.productosMasVendidos.forEach(
          (item) => {
            document
              .fillColor("#536057")
              .fontSize(9)
              .text(
                `${item.posicion}. ${item.nombreProducto} — ${item.cantidad} uds. — ${money(item.total)}`,
              );
          },
        );
      }

      document.end();
    },
  );
}
