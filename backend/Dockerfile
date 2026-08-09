FROM node:24-alpine AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS build

COPY prisma.config.ts tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

RUN npx prisma generate
RUN npm run build

FROM node:24-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

RUN apk add --no-cache postgresql-client
RUN addgroup -S nodeapp && adduser -S nodeapp -G nodeapp

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build --chown=nodeapp:nodeapp /app/dist ./dist
COPY --chown=nodeapp:nodeapp scripts ./scripts

RUN mkdir -p /app/backups && chown -R nodeapp:nodeapp /app/backups

USER nodeapp
EXPOSE 3000

CMD ["node", "dist/server.js"]
