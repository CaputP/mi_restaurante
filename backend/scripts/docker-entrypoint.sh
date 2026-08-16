#!/bin/sh
set -eu

echo "Aplicando migraciones pendientes de Prisma..."
npm run prisma:migrate:deploy

echo "Sincronizando datos estructurales iniciales..."
npm run prisma:seed

echo "Iniciando la API..."
exec "$@"
