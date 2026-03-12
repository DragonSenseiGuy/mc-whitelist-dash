export function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("mc_admin_token")
      : null;

  if (token) {
    const headers = new Headers(init?.headers);
    if (!headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return fetch(input, { ...init, headers });
  }

  return fetch(input, init);
}
