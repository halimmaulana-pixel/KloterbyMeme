const TOKEN_KEY = "kloterby_token";
const ROLE_KEY = "kloterby_role";
const TENANT_KEY = "kloterby_tenant";

export function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setSession(arg1, arg2, arg3) {
  if (typeof window === "undefined") return;
  
  let token, role, tenantId;
  
  // Support both: setSession({token, role}) AND setSession(token, role, tenantId)
  if (typeof arg1 === 'object' && arg1 !== null) {
    token = arg1.token || arg1.access_token;
    role = arg1.role;
    tenantId = arg1.tenant_id;
  } else {
    token = arg1;
    role = arg2;
    tenantId = arg3;
  }

  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  if (role) window.localStorage.setItem(ROLE_KEY, role);
  if (tenantId) window.localStorage.setItem(TENANT_KEY, tenantId);
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(ROLE_KEY);
  window.localStorage.removeItem(TENANT_KEY);
}

export function getRole() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ROLE_KEY);
}

export function getTenantId() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TENANT_KEY);
}
