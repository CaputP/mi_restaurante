# Flujo de reserva, adelanto, atención y venta

## Ruta operativa

1. El cliente solicita una reserva y, si corresponde, informa el adelanto requerido.
2. El administrador revisa el pago y selecciona la caja abierta que realmente recibió el dinero.
3. La confirmación es transaccional: valida la caja y la sucursal, asigna una constancia `AR-xxxxxx`, actualiza el adelanto de la reserva y concilia el medio de pago en caja.
4. La constancia puede consultarse e imprimirse desde el detalle administrativo o desde **Mis reservas**. Es una constancia interna y no reemplaza una boleta tributaria.
5. La reserva queda confirmada, pero no aparece anticipadamente en la cola de cobro.
6. En la fecha programada, el administrador usa **Atender reserva / Generar pedido**. La operación es idempotente: si ya existe un pedido vinculado, devuelve el existente y no crea otro.
7. El pedido se revisa y se envía. En ese momento ingresa al flujo operativo de cocina/barra y queda disponible en Caja.
8. Caja aplica automáticamente el adelanto confirmado, cobra únicamente el saldo pendiente y genera el ticket de venta.
9. Al registrar la venta, la reserva pasa a `ATENDIDA` y los movimientos aparecen en reportes.

## Criterio contable y de conciliación

- `totalAdelantos` muestra el dinero de reservas recibido por una caja.
- Los totales por método de pago incluyen el movimiento de efectivo/Yape/Plin/tarjeta/transferencia que realmente ingresó a esa caja.
- `totalVentas` se registra al generar la venta por el valor completo vendido.
- `adelantoAplicado` identifica la parte ya cobrada y `saldoCobrar` la parte recibida al emitir el ticket.
- Reportes muestra adelantos y ventas por separado. El adelanto aplicado no se vuelve a registrar como un segundo pago, evitando duplicidad.

## Controles de integridad

- No se confirma un adelanto sin caja abierta de la misma sucursal.
- Un pago pendiente solo puede confirmarse una vez.
- Cada constancia usa un correlativo transaccional único dentro de su sucursal.
- Una reserva solo puede tener un pedido asociado.
- El pedido solo se genera para una reserva `CONFIRMADA` en su fecha de atención y con productos aprobados.
- Una venta no puede crearse dos veces para el mismo pedido.
- Los cambios notifican en tiempo real a Reservas, Pedidos, Caja y Reportes.
