const TOKEN_KEY = "kloterby_token";
const ROLE_KEY = "kloterby_role";

export function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setSession({ token, role }) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(ROLE_KEY, role);
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(ROLE_KEY);
}

export function getRole() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ROLE_KEY);
}
