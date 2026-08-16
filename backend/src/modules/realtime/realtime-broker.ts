import type {
  Response,
} from "express";
import {
  Client,
} from "pg";

import {
  env,
} from "../../config/env.js";
import {
  logger,
} from "../../lib/logger.js";

export const REALTIME_RESOURCES = [
  "NOTIFICATIONS",
  "RESERVATIONS",
  "ORDERS",
  "COMMANDS",
  "DELIVERIES",
  "CASH",
  "SALES",
  "EXPENSES",
  "REPORTS",
  "INVENTORY",
  "CATALOG",
  "LOYALTY",
  "PROMOTIONS",
  "USERS",
  "ROLES",
  "BRANCHES",
  "SETTINGS",
  "AUDIT",
  "CLAIMS",
  "REVIEWS",
  "BACKUPS",
] as const;

export type RealtimeResource =
  typeof REALTIME_RESOURCES[number];

type RealtimeEvent = {
  id: string;
  type: "DATA_CHANGED";
  resources:
    RealtimeResource[];
  createdAt: string;
  userIds?: string[];
};

type RealtimeClient = {
  id: string;
  userId: string;
  response: Response;
  heartbeat:
    NodeJS.Timeout;
};

const CHANNEL =
  "vallecito_realtime_events";
const MAX_CLIENTS = 5_000;
const MAX_CLIENTS_PER_USER = 8;

const clients =
  new Map<
    string,
    RealtimeClient
  >();

let listener:
  Client | null = null;
let reconnectTimer:
  NodeJS.Timeout | null = null;
let isStopping = false;
let eventSequence = 0;

function sendEvent(
  response: Response,
  eventName: string,
  data: unknown,
  id?: string,
): void {
  if (response.writableEnded) {
    return;
  }

  if (id) {
    response.write(
      `id: ${id}\n`,
    );
  }

  response.write(
    `event: ${eventName}\n`,
  );
  response.write(
    `data: ${JSON.stringify(data)}\n\n`,
  );
}

function broadcast(
  event: RealtimeEvent,
): void {
  const targetUsers =
    event.userIds?.length
      ? new Set(event.userIds)
      : null;

  for (const client of clients.values()) {
    if (
      targetUsers &&
      !targetUsers.has(client.userId)
    ) {
      continue;
    }

    sendEvent(
      client.response,
      "data-changed",
      event,
      event.id,
    );
  }
}

function scheduleReconnect(): void {
  if (
    isStopping ||
    reconnectTimer
  ) {
    return;
  }

  reconnectTimer =
    setTimeout(() => {
      reconnectTimer = null;
      void connectListener();
    }, 5_000);

  reconnectTimer.unref();
}

async function connectListener(): Promise<void> {
  if (
    isStopping ||
    listener
  ) {
    return;
  }

  const client = new Client({
    connectionString:
      env.DATABASE_URL,
    application_name:
      "vallecito-realtime",
    keepAlive: true,
    keepAliveInitialDelayMillis:
      10_000,
  });

  listener = client;

  client.on(
    "notification",
    (notification) => {
      if (
        notification.channel !==
          CHANNEL ||
        !notification.payload
      ) {
        return;
      }

      try {
        const event =
          JSON.parse(
            notification.payload,
          ) as RealtimeEvent;

        if (
          event.type ===
            "DATA_CHANGED" &&
          Array.isArray(
            event.resources,
          )
        ) {
          broadcast(event);
        }
      } catch (error: unknown) {
        logger.warn(
          {
            error,
          },
          "Se recibió un evento en tiempo real inválido.",
        );
      }
    },
  );

  client.on(
    "error",
    (error) => {
      logger.warn(
        {
          error,
        },
        "Se perdió la conexión del canal en tiempo real.",
      );

      if (listener === client) {
        listener = null;
      }

      scheduleReconnect();
    },
  );

  client.on(
    "end",
    () => {
      if (listener === client) {
        listener = null;
      }

      scheduleReconnect();
    },
  );

  try {
    await client.connect();
    await client.query(
      `LISTEN ${CHANNEL}`,
    );

    logger.info(
      "Canal de actualizaciones en tiempo real conectado.",
    );
  } catch (error: unknown) {
    if (listener === client) {
      listener = null;
    }

    await client
      .end()
      .catch(() => undefined);

    logger.warn(
      {
        error,
      },
      "No se pudo iniciar el canal en tiempo real; se reintentará.",
    );

    scheduleReconnect();
  }
}

export async function startRealtimeBroker(): Promise<void> {
  isStopping = false;
  await connectListener();
}

export function closeRealtimeConnections(): void {
  for (const client of clients.values()) {
    clearInterval(
      client.heartbeat,
    );

    if (!client.response.writableEnded) {
      sendEvent(
        client.response,
        "server-closing",
        {
          reconnect: true,
        },
      );
      client.response.end();
    }
  }

  clients.clear();
}

export async function stopRealtimeBroker(): Promise<void> {
  isStopping = true;

  if (reconnectTimer) {
    clearTimeout(
      reconnectTimer,
    );
    reconnectTimer = null;
  }

  closeRealtimeConnections();

  const currentListener =
    listener;
  listener = null;

  if (currentListener) {
    await currentListener
      .end()
      .catch((error: unknown) => {
        logger.warn(
          {
            error,
          },
          "No se pudo cerrar limpiamente el canal en tiempo real.",
        );
      });
  }
}

export function canSubscribeRealtimeUser(
  userId: string,
): boolean {
  if (
    clients.size >=
    MAX_CLIENTS
  ) {
    return false;
  }

  let userConnections = 0;

  for (const client of clients.values()) {
    if (
      client.userId ===
      userId
    ) {
      userConnections += 1;
    }
  }

  return userConnections <
    MAX_CLIENTS_PER_USER;
}

export function subscribeRealtimeClient(
  userId: string,
  response: Response,
): () => void {
  const id =
    `${userId}:${Date.now()}:${Math.random()}`;

  const heartbeat =
    setInterval(() => {
      if (
        !response.writableEnded
      ) {
        response.write(
          `: heartbeat ${Date.now()}\n\n`,
        );
      }
    }, 20_000);

  heartbeat.unref();

  clients.set(id, {
    id,
    userId,
    response,
    heartbeat,
  });

  sendEvent(
    response,
    "connected",
    {
      connectedAt:
        new Date()
          .toISOString(),
    },
  );

  let isClosed = false;

  return () => {
    if (isClosed) {
      return;
    }

    isClosed = true;
    clearInterval(heartbeat);
    clients.delete(id);
  };
}

export async function publishRealtimeChange(
  resources:
    RealtimeResource[],
  userIds?: string[],
): Promise<void> {
  const uniqueResources =
    [...new Set(resources)];

  if (
    uniqueResources.length ===
    0
  ) {
    return;
  }

  eventSequence =
    (eventSequence + 1) %
    Number.MAX_SAFE_INTEGER;

  const event: RealtimeEvent = {
    id: `${Date.now()}-${eventSequence}`,
    type: "DATA_CHANGED",
    resources:
      uniqueResources,
    createdAt:
      new Date()
        .toISOString(),

    ...(userIds?.length
      ? {
          userIds: [
            ...new Set(
              userIds,
            ),
          ],
        }
      : {}),
  };

  if (!listener) {
    broadcast(event);
    return;
  }

  try {
    await listener.query(
      "SELECT pg_notify($1, $2)",
      [
        CHANNEL,
        JSON.stringify(event),
      ],
    );
  } catch (error: unknown) {
    logger.warn(
      {
        error,
        resources:
          uniqueResources,
      },
      "No se pudo publicar una actualización en tiempo real.",
    );

    broadcast(event);
  }
}
