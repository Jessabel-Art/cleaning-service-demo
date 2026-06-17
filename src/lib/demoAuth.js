const DEMO_SESSION_KEY = "cleanproDemoSession";

export const DEMO_INVALID_MESSAGE =
  "Invalid demo credentials. Please use the demo usernames provided above.";

export const DEMO_CREDENTIALS = [
  {
    role: "client",
    username: "clientdemo",
    password: "demo123",
    redirect: "/portal",
    displayName: "Client Demo",
  },
  {
    role: "admin",
    username: "admindemo",
    password: "demo123",
    redirect: "/admin",
    displayName: "Admin Demo",
  },
];

export function findDemoCredential(username, password) {
  const normalizedUsername = String(username || "").trim().toLowerCase();
  return (
    DEMO_CREDENTIALS.find(
      (credential) =>
        normalizedUsername === credential.username &&
        password === credential.password
    ) || null
  );
}

export function createDemoUser(session) {
  if (!session) return null;

  return {
    uid: `demo-${session.role}`,
    displayName: session.displayName,
    email: null,
    phoneNumber: null,
    isDemo: true,
    demoRole: session.role,
    username: session.username,
  };
}

export function getDemoSession() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(DEMO_SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const valid = DEMO_CREDENTIALS.find(
        (credential) =>
          credential.role === parsed?.role &&
          credential.username === parsed?.username
      );
      if (valid) {
        return {
          role: valid.role,
          username: valid.username,
          displayName: valid.displayName,
        };
      }
    }

    const legacyRole = window.sessionStorage.getItem("demoRole");
    const legacy = DEMO_CREDENTIALS.find(
      (credential) => credential.role === legacyRole
    );
    return legacy
      ? {
          role: legacy.role,
          username: legacy.username,
          displayName: legacy.displayName,
        }
      : null;
  } catch {
    return null;
  }
}

export function setDemoSession(credential) {
  if (typeof window === "undefined" || !credential) return null;

  const session = {
    role: credential.role,
    username: credential.username,
    displayName: credential.displayName,
  };

  window.sessionStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
  window.sessionStorage.setItem("demoRole", credential.role);
  return session;
}

export function clearDemoSession() {
  if (typeof window === "undefined") return;

  window.sessionStorage.removeItem(DEMO_SESSION_KEY);
  window.sessionStorage.removeItem("demoRole");
}

export function isDemoAdminSession(session = getDemoSession()) {
  return session?.role === "admin";
}

export function isDemoClientSession(session = getDemoSession()) {
  return session?.role === "client";
}
