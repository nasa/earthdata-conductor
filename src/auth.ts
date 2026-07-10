import { InvalidTokenError } from "skybridge/server";

export interface AuthInfo {
  uid: string;
  first_name: string;
  last_name: string;
  email_address: string;
  scopes: string[];
}

export async function verifyAccessToken(token: string): Promise<AuthInfo> {
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
      uid: data.uid,
      first_name: data.first_name,
      last_name: data.last_name,
      email_address: data.email_address,
      scopes: [], // URS doesn't use standard scopes; default to empty list
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
