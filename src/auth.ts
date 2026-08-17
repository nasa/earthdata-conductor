import { type AuthInfo, InvalidTokenError } from "skybridge/server";

export interface EarthdataAuthInfo extends AuthInfo {
  extra: {
    uid: string;
    first_name: string;
    last_name: string;
    email_address: string;
  };
}

export async function verifyAccessToken(
  token: string,
): Promise<EarthdataAuthInfo> {
  if (process.env.AUTH_TOKEN && token === process.env.AUTH_TOKEN) {
    return {
      token,
      clientId: process.env.EARTHDATA_CLIENT_ID || "mock-client-id",
      scopes: [],
      expiresAt: Math.floor(Date.now() / 1000) + 3600 * 24 * 365, // 1 year expiry
      extra: {
        uid: "localdev",
        first_name: "Local",
        last_name: "Dev",
        email_address: "localdev@earthdata.nasa.gov",
      },
    };
  }

  const serverUrl =
    process.env.EARTHDATA_SERVER_URL || "https://uat.urs.earthdata.nasa.gov";
  const clientId = process.env.EARTHDATA_CLIENT_ID;
  const clientSecret = process.env.EARTHDATA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "EARTHDATA_CLIENT_ID or EARTHDATA_CLIENT_SECRET is not configured.",
    );
  }

  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64",
  );

  try {
    const response = await fetch(`${serverUrl}/oauth/tokens/user`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ token }),
    });

    if (!response.ok) {
      throw new InvalidTokenError("Token is invalid or expired.");
    }

    const data = await response.json();
    return {
      token,
      clientId,
      scopes: [],
      expiresAt:
        typeof data.exp === "number"
          ? data.exp
          : Math.floor(Date.now() / 1000) + 3600,
      extra: {
        uid: data.uid,
        first_name: data.first_name,
        last_name: data.last_name,
        email_address: data.email_address,
      },
    };
  } catch (err) {
    if (err instanceof InvalidTokenError) {
      throw err;
    }
    throw new InvalidTokenError(
      `Failed to verify token: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
