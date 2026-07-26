import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";

const server = app.listen(env.PORT, () => {
  console.log(
    `Servidor ejecutándose en http://localhost:${env.PORT}`,
  );
});

async function closeServer(signal: string): Promise<void> {
  console.log(`\nSe recibió ${signal}. Cerrando servidor...`);

  server.close(async () => {
    await prisma.$disconnect();

    console.log("Servidor cerrado correctamente.");
    process.exit(0);
  });
}

process.on("SIGINT", () => {
  void closeServer("SIGINT");
});

process.on("SIGTERM", () => {
  void closeServer("SIGTERM");
});