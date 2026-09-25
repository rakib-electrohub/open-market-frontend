import { cookies } from "next/headers";

const apiBaseUrl = process.env.API_URL || "http://localhost:4000";

export async function serverApi(path, options = {}) {
  const cookieStore = await cookies();
  const requestHeaders = new Headers(options.headers);
  const cookieHeader = cookieStore.toString();
  if (cookieHeader) requestHeaders.set("cookie", cookieHeader);

  const response = await fetch(`${apiBaseUrl}/api${path}`, {
    ...options,
    headers: requestHeaders,
    cache: options.cache || "no-store",
  });

  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const error = new Error(`API request failed: ${response.status}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }

  return body;
}

export async function getCurrentUser() {
  try {
    return await serverApi("/auth/me");
  } catch (error) {
    if (error.status === 401 || error.status === 403) return null;
    throw error;
  }
}