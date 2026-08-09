import type { Response } from "express";
import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  accessTokenCookieName,
  establishAuthSession,
} from "../src/modules/auth/auth-session.js";

describe("sesión mediante cookies", () => {
  it("mantiene el JWT fuera del alcance de JavaScript", () => {
    const cookie = vi.fn();
    const response = {
      cookie,
    } as unknown as Response;

    const csrfToken = establishAuthSession(
      response,
      "signed-access-token",
    );

    expect(csrfToken).toMatch(
      /^[A-Za-z0-9_-]{40,100}$/,
    );
    expect(cookie).toHaveBeenCalledTimes(2);
    expect(cookie).toHaveBeenNthCalledWith(
      1,
      accessTokenCookieName,
      "signed-access-token",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      }),
    );
    expect(cookie).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("csrf"),
      csrfToken,
      expect.objectContaining({
        httpOnly: false,
        sameSite: "lax",
        path: "/",
      }),
    );
  });
});
