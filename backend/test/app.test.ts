import request from "supertest";
import {
  describe,
  expect,
  it,
} from "vitest";

import {
  app,
} from "../src/app.js";

describe("API base", () => {
  it("expone un health check sin filtrar el entorno", async () => {
    const response =
      await request(app)
        .get("/api/health")
        .expect(200);

    expect(
      response.body,
    ).toMatchObject({
      success: true,
    });

    expect(
      response.body,
    ).not.toHaveProperty(
      "environment",
    );

    expect(
      response.headers[
        "x-request-id"
      ],
    ).toBeTruthy();

    expect(
      response.headers[
        "x-powered-by"
      ],
    ).toBeUndefined();

    expect(
      response.headers[
        "x-content-type-options"
      ],
    ).toBe("nosniff");
  });

  it("protege los recursos autenticados", async () => {
    const response =
      await request(app)
        .get(
          "/api/notifications",
        )
        .expect(401);

    expect(
      response.body.code,
    ).toBe(
      "TOKEN_REQUERIDO",
    );

    const realtimeResponse =
      await request(app)
        .get(
          "/api/v1/realtime/events",
        )
        .expect(401);

    expect(
      realtimeResponse.body.code,
    ).toBe(
      "TOKEN_REQUERIDO",
    );
  });

  it("devuelve un error uniforme para rutas inexistentes", async () => {
    const response =
      await request(app)
        .get(
          "/api/not-a-route",
        )
        .expect(404);

    expect(
      response.body,
    ).toMatchObject({
      success: false,
      code:
        "ROUTE_NOT_FOUND",
    });
  });

  it("solo permite el origen configurado", async () => {
    const allowed =
      await request(app)
        .get("/api/health")
        .set(
          "Origin",
          process.env.FRONTEND_URL!,
        )
        .expect(200);

    expect(
      allowed.headers[
        "access-control-allow-origin"
      ],
    ).toBe(
      process.env.FRONTEND_URL,
    );

    const blocked =
      await request(app)
        .get("/api/health")
        .set(
          "Origin",
          "https://malicious.example",
        )
        .expect(403);

    expect(
      blocked.body.code,
    ).toBe(
      "ORIGIN_NOT_ALLOWED",
    );
  });

  it("exige CSRF cuando una cookie de sesión autoriza una mutación", async () => {
    const rejected =
      await request(app)
        .post("/api/not-a-route")
        .set(
          "Cookie",
          "vallecito_session=fake-session",
        )
        .expect(403);

    expect(rejected.body.code).toBe(
      "CSRF_TOKEN_INVALIDO",
    );

    await request(app)
      .post("/api/not-a-route")
      .set(
        "Cookie",
        [
          "vallecito_session=fake-session",
          "vallecito_csrf=matching-token",
        ],
      )
      .set(
        "X-CSRF-Token",
        "matching-token",
      )
      .expect(404);
  });
});
