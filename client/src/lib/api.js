const API_URL = "http://localhost:4000/api";

function getToken() {
  return localStorage.getItem("dcc-token");
}

export async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({ message: "Request failed" }));
    const issueText = Array.isArray(data.issues)
      ? data.issues.map((issue) => {
        const field = Array.isArray(issue.path) && issue.path.length ? issue.path.join(".") : "payload";
        return `${field}: ${issue.message}`;
      }).join("; ")
      : "";
    throw new Error([data.message || "Request failed", issueText].filter(Boolean).join(" - "));
  }

  return response.json();
}

export async function login(credentials) {
  return apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials)
  });
}

export function postJson(path, body) {
  return apiFetch(path, {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export function patchJson(path, body) {
  return apiFetch(path, {
    method: "PATCH",
    body: JSON.stringify(body)
  });
}

export function deleteJson(path) {
  return apiFetch(path, {
    method: "DELETE"
  });
}
