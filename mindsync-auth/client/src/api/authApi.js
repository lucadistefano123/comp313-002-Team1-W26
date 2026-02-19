const API_BASE = "/api";

export async function registerUser({ fullName, email, password }) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ fullName, email, password }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Register failed");
  return data;
}

export async function loginUser({ email, password }) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Login failed");
  return data;
}

export async function me() {
  const res = await fetch(`${API_BASE}/auth/me`, {
    credentials: "include",
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Not authenticated");
  return data;
}

export async function logoutUser() {
  const res = await fetch(`${API_BASE}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });

  return res.json();
}
