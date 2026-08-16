CREATE SEQUENCE IF NOT EXISTS reclamo_consumidor_numero_seq
  AS BIGINT
  START WITH 1
  INCREMENT BY 1
  NO CYCLE;

SELECT setval(
  'reclamo_consumidor_numero_seq',
  GREATEST((SELECT COUNT(*) FROM reclamo_consumidor), 1),
  (SELECT COUNT(*) > 0 FROM reclamo_consumidor)
);
