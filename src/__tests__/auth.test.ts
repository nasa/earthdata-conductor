import { InvalidTokenError } from "skybridge/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { verifyAccessToken } from "../auth.js";

describe("verifyAccessToken", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    process.env.EARTHDATA_CLIENT_ID = "mock-client-id";
    process.env.EARTHDATA_CLIENT_SECRET = "mock-client-secret";
    process.env.EARTHDATA_SERVER_URL = "https://uat.urs.earthdata.nasa.gov";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...originalEnv };
  });

  it("should throw an error if EARTHDATA_CLIENT_ID is missing", async () => {
    delete process.env.EARTHDATA_CLIENT_ID;
    await expect(verifyAccessToken("some-token")).rejects.toThrow(
      "EARTHDATA_CLIENT_ID or EARTHDATA_CLIENT_SECRET is not configured.",
    );
  });

  it("should throw an error if EARTHDATA_CLIENT_SECRET is missing", async () => {
    delete process.env.EARTHDATA_CLIENT_SECRET;
    await expect(verifyAccessToken("some-token")).rejects.toThrow(
      "EARTHDATA_CLIENT_ID or EARTHDATA_CLIENT_SECRET is not configured.",
    );
  });

  it("should validate access token and return AuthInfo on success", async () => {
    const mockUser = {
      uid: "testuser",
      first_name: "Test",
      last_name: "User",
      email_address: "testuser@nasa.gov",
      exp: 1783806796,
    };

    const mockResponse = {
      ok: true,
      json: async () => mockUser,
    };

    vi.mocked(fetch).mockResolvedValueOnce(mockResponse as Response);

    const result = await verifyAccessToken("valid-token");

    expect(result).toEqual({
      token: "valid-token",
      clientId: "mock-client-id",
      scopes: [],
      expiresAt: 1783806796,
      extra: {
        uid: "testuser",
        first_name: "Test",
        last_name: "User",
        email_address: "testuser@nasa.gov",
      },
    });

    const expectedAuthHeader = Buffer.from(
      "mock-client-id:mock-client-secret",
    ).toString("base64");
    expect(fetch).toHaveBeenCalledWith(
      "https://uat.urs.earthdata.nasa.gov/oauth/tokens/user",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${expectedAuthHeader}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ token: "valid-token" }),
      },
    );
  });

  it("should throw InvalidTokenError if the verification endpoint returns non-ok status", async () => {
    const mockResponse = {
      ok: false,
    };

    vi.mocked(fetch).mockResolvedValueOnce(mockResponse as Response);

    await expect(verifyAccessToken("invalid-token")).rejects.toThrow(
      InvalidTokenError,
    );
  });

  it("should throw InvalidTokenError if fetch fails", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(
      new Error("Network connection error"),
    );

    await expect(verifyAccessToken("some-token")).rejects.toThrow(
      InvalidTokenError,
    );
  });

  it("should bypass verification if AUTH_TOKEN matches token", async () => {
    process.env.AUTH_TOKEN = "local-dev-token";
    const result = await verifyAccessToken("local-dev-token");

    expect(result).toEqual({
      token: "local-dev-token",
      clientId: "mock-client-id",
      scopes: [],
      expiresAt: expect.any(Number),
      extra: {
        uid: "localdev",
        first_name: "Local",
        last_name: "Dev",
        email_address: "localdev@earthdata.nasa.gov",
      },
    });
    // Ensure fetch was not called
    expect(fetch).not.toHaveBeenCalled();
  });

  it("should bypass verification and not throw on missing client credentials if AUTH_TOKEN matches token", async () => {
    process.env.AUTH_TOKEN = "local-dev-token";
    delete process.env.EARTHDATA_CLIENT_ID;
    delete process.env.EARTHDATA_CLIENT_SECRET;

    const result = await verifyAccessToken("local-dev-token");

    expect(result.clientId).toBe("mock-client-id");
    expect(fetch).not.toHaveBeenCalled();
  });
});
