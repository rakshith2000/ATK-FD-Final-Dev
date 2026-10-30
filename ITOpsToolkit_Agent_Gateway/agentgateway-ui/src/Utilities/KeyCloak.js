// src/Utilities/KeyCloak.js
import Keycloak from "keycloak-js";

/**
 * Lazily create a Keycloak instance using values from /public/config.json:
 * {
 *   "keycloak": { "url": "...", "realm": "...", "clientId": "..." }
 * }
 */

let realKeycloak = null;
let loadPromise = null;

function resetKeycloak() {
  realKeycloak = null;
  loadPromise = null;
}

async function createKeycloakFromConfig() {
  let resp = await fetch("/config.json", { cache: "no-cache" }).catch(() => null);
  if (!resp || !resp.ok) {
    resp = await fetch("/app-config.json", { cache: "no-cache" }).catch(() => null);
  }
  if (!resp || !resp.ok) {
    throw new Error("Failed to fetch Keycloak configuration from /config.json or /app-config.json");
  }
  const cfg = await resp.json();

  const kcCfg = cfg?.keycloak || cfg?.auth?.keycloak;
  if (!kcCfg?.url || !kcCfg?.realm || !kcCfg?.clientId) {
    throw new Error("Missing keycloak configuration in config.json / app-config.json (need url, realm, clientId)");
  }

  return new Keycloak({
    url: kcCfg.url,
    realm: kcCfg.realm,
    clientId: kcCfg.clientId,
  });
}

async function getKeycloak() {
  if (realKeycloak) return realKeycloak;

  if (!loadPromise) {
    loadPromise = (async () => {
      realKeycloak = await createKeycloakFromConfig();
      return realKeycloak;
    })();
  }
  return loadPromise;
}

/**
 * Facade that matches the Keycloak API shape you use.
 * Methods that return promises are proxied so you can call them immediately.
 * Properties (token, tokenParsed, authenticated) are exposed via getters.
 */
const keycloakFacade = {
  // ---- Methods that return promises (safe to call before real instance exists)
  init: async (options) => (await getKeycloak()).init(options),
  login: async (options) => (await getKeycloak()).login(options),
  logout: async (options) => {
    const kc = await getKeycloak();
    resetKeycloak();
    return kc.logout(options);
  },
  register: async (options) => (await getKeycloak()).register(options),
  accountManagement: async () => (await getKeycloak()).accountManagement(),
  updateToken: async (minValidity) => (await getKeycloak()).updateToken(minValidity),
  clearToken: async () => (await getKeycloak()).clearToken(),
  loadUserProfile: async () => (await getKeycloak()).loadUserProfile(),
  loadUserInfo: async () => (await getKeycloak()).loadUserInfo(),
  hasRealmRole: (role) => (realKeycloak ? realKeycloak.hasRealmRole(role) : false),
  hasResourceRole: (role, resource) =>
    realKeycloak ? realKeycloak.hasResourceRole(role, resource) : false,

  // ---- Commonly accessed properties (read-only getters)
  get token() {
    return realKeycloak?.token;
  },
  get tokenParsed() {
    return realKeycloak?.tokenParsed;
  },
  get authenticated() {
    return realKeycloak?.authenticated;
  },
  get realmAccess() {
    return realKeycloak?.realmAccess;
  },
  get resourceAccess() {
    return realKeycloak?.resourceAccess;
  },
};

export { resetKeycloak };
export default keycloakFacade;