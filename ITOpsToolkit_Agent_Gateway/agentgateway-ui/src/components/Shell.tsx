import {
  Link,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import {
  BarChart3,
  Bot,
  Braces,
  Cable,
  Boxes,
  Coins,
  FileCode2,
  Github,
  Globe,
  Home,
  KeyRound,
  MessageSquarePlus,
  Network,
  Route,
  ScrollText,
  ShieldCheck,
  Shield,
  SlidersHorizontal,
  Bolt,
  Play,
  Server,
} from "lucide-react";
import { createContext, useContext, useEffect, useState } from "react";
import { Tooltip } from "./Primitives";
import { useConfigDumpMode, useGatewayConfig } from "../hooks";
// import mockKeycloakData from "../mockKeycloakData";
// @ts-ignore
import realKeycloak from "../Utilities/KeyCloak";

const keycloak: any = realKeycloak;
console.log("Keycloak instance:", keycloak);

type AccessLevel = "read" | "write";
type AccessMap = Map<string, AccessLevel>;

const PageAccessContext = createContext<AccessMap | null>(null);

export function usePageAccess(key: string): AccessLevel | null {
  const map = useContext(PageAccessContext);
  if (!map) return null;
  return map.get(key) ?? null;
}

type NavItemConfig = {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  placeholder?: boolean;
  groupStart?: boolean;
  exact?: boolean;
  accessKey?: string; // last segment of /AgentGateway/<key>, or "home" for /AgentGateway root
};

// const projectLinks = [
//   {
//     label: "GitHub",
//     href: "https://github.com/agentgateway/agentgateway",
//     icon: Github,
//   },
//   {
//     label: "Documentation",
//     href: "https://agentgateway.dev/docs/standalone/latest/",
//     icon: Globe,
//   },
//   {
//     label: "Feedback",
//     href: "https://github.com/agentgateway/agentgateway/issues/new?title=UI%20feedback%3A%20&body=Thanks%20for%20trying%20the%20agentgateway%20UI.%0A%0AWhat%20happened%3F%0A%0AWhat%20did%20you%20expect%20instead%3F%0A%0AAny%20screenshots%2C%20logs%2C%20or%20config%20that%20would%20help%3F",
//     icon: MessageSquarePlus,
//   },
// ] as const;

const ALL_ACCESS_KEYS = [
  "home", "models", "providers", "policies", "guardrails", "keys", "costs",
  "analytics", "logs", "client-setup", "playground", "servers", "mcp-policies",
  "tool-playground", "gateways", "listeners", "routes", "traffic-policies",
  "cel", "raw-config", "settings"
];

function extractAccessMap(groups: string[] = [], roles: string[] = []): AccessMap {
  const map = new Map<string, AccessLevel>();

  // Page visibility is GRANULAR and driven entirely by the per-page child groups
  // below. Group membership alone never grants blanket access — NOT /Admin and
  // NOT /Admin/Agent_Gateway, which are only the portal's access GATES (needed to
  // reach the module, but they do not open every page). So a user whose only
  // AgentGateway group is /Admin/Agent_Gateway/analytics sees ONLY Analytics.
  //
  // The single exception is an explicit "admin" realm ROLE (opt-in super-admin);
  // `default-roles-<realm>` is deliberately excluded since every user has it.
  const isFullAdmin = roles.includes("admin");

  if (isFullAdmin) {
    for (const key of ALL_ACCESS_KEYS) {
      map.set(key, "write");
    }
  }

  // Granular per-page groups. A page group grants READ; a "write" child under it
  // grants WRITE. Supported layouts (in order of preference):
  //   /Admin/Agent_Gateway/<page>[/write]   ← current group structure
  //   /AgentGateway/<page>[/write]          ← legacy
  const GRANULAR_PREFIXES = ["/Admin/Agent_Gateway/", "/AgentGateway/"];
  for (const group of groups) {
    const prefix = GRANULAR_PREFIXES.find((p) => group.startsWith(p));
    if (!prefix) continue;
    const parts = group.slice(prefix.length).split("/");
    const key = parts[0];
    if (!key) continue;
    if (parts.length === 1) {
      if (!map.has(key)) map.set(key, "read");
    } else if (parts.length === 2 && parts[1] === "write") {
      map.set(key, "write");
    }
  }

  return map;
}

export function Shell() {
  const router = useRouterState();
  const navigate = useNavigate();
  const mode = useConfigDumpMode();
  // null = still loading; Map = resolved
  const [accessMap, setAccessMap] = useState<AccessMap | null>(null);

  useEffect(() => {
    const applyAuth = (kc: any) => {
      const groups: string[] = kc.tokenParsed?.groups ?? kc.groups ?? [];
      const roles: string[] = kc.tokenParsed?.realm_access?.roles ?? kc.realmAccess?.roles ?? [];
      const map = extractAccessMap(groups, roles);
      setAccessMap(map);
    };

    if (keycloak.authenticated) {
      applyAuth(keycloak);
      return;
    }

    // Require a REAL Keycloak login. `login-required` redirects unauthenticated
    // users to the Keycloak login page (same origin) and returns them here after
    // sign-in; if they already have a portal SSO session (same realm/client) it
    // resolves silently with no visible login. This is why hitting /ui directly
    // must authenticate first instead of showing content.
    //
    // The mock instance is a LOCAL-DEV convenience ONLY — never in a real build,
    // so production can never grant access without a genuine token.
    keycloak
      .init({ onLoad: "login-required", checkLoginFrame: false, pkceMethod: "S256" })
      .then(() => applyAuth(keycloak))
      .catch((err: any) => {
        const isLocalDev =
          window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1";
        if (isLocalDev) {
          console.warn("Keycloak init failed — using mock auth (local dev only)", err);
          // applyAuth(mockKeycloakData);
        } else {
          // Do NOT fall back to mock in production. Leave accessMap null so the
          // shell stays on the auth screen and no gateway content is exposed.
          console.error("Keycloak authentication failed; access denied", err);
        }
      });
  }, []);

  const dumpMode = mode.data?.mode === "dump";
  const config = useGatewayConfig({
    enabled: Boolean(mode.data && mode.data.mode !== "dump"),
  });
  const hasLlm = dumpMode
    ? false
    : config.data
      ? Boolean(config.data.llm)
      : true;
  const hasMcp = dumpMode
    ? false
    : config.data
      ? Boolean(config.data.mcp)
      : true;
  const hasTraffic = dumpMode
    ? true
    : config.data
      ? Boolean(config.data.binds?.length) ||
      "gateways" in config.data ||
      "routes" in config.data
      : true;
  const hasBinds = dumpMode
    ? true
    : config.data
      ? Boolean(config.data.binds?.length)
      : false;

  const navGroups = navigationGroups({
    hasLlm,
    hasMcp,
    hasTraffic,
    hasBinds,
    dumpMode,
    accessMap,
  });

  const nav = navGroups.flatMap((group) => group.items);

  // Route-level protection: redirect to first allowed page if current route is not accessible
  useEffect(() => {
    if (accessMap === null) return; // still loading
    const isAllowed = nav.some((item) => navItemActive(item, router.location.pathname));
    if (!isAllowed && nav.length > 0) {
      void navigate({ to: nav[0].to });
    }
  }, [accessMap, router.location.pathname]);

  // Force the light theme so the UI matches the host portal's white look. Dark
  // mode is intentionally not offered here; clear any previously saved choice.
  useEffect(() => {
    document.documentElement.dataset.theme = "light";
    localStorage.setItem("theme", "light");
  }, []);

  // When embedded in a host portal (iframe), report the current section + page to
  // the parent (same origin) so it can reflect it in its breadcrumb, e.g.
  // "Agent Gateway / LLM / Models". No-op when running top-level/standalone.
  useEffect(() => {
    if (window.parent === window) return;
    const active = navGroups
      .flatMap((group) => group.items.map((item) => ({ item, group })))
      .filter(({ item }) => navItemActive(item, router.location.pathname))
      .sort((a, b) => b.item.to.length - a.item.to.length)[0];
    window.parent.postMessage(
      {
        type: "agentgateway:navigate",
        section: active?.group.title ?? null,
        page: active?.item.label ?? null,
        path: router.location.pathname,
      },
      window.location.origin,
    );
  }, [router.location.pathname, accessMap, hasLlm, hasMcp, hasTraffic, dumpMode]);

  if (accessMap === null) {
    return (
      <div className="app-shell">
        <aside className="sidebar">
          <nav className="nav-list" aria-label="Primary">
            {[
              { section: "60%", items: [55, 75, 45] },
              { section: "50%", items: [65, 80, 50, 70] },
              { section: "55%", items: [60, 72] },
            ].map((group, gi) => (
              <div key={gi}>
                <div
                  className="nav-section skeleton-bar"
                  style={{ width: group.section, height: 9, margin: "8px 12px 6px" }}
                />
                {group.items.map((w, ii) => (
                  <div
                    key={ii}
                    className="nav-item"
                    style={{ gap: 10, pointerEvents: "none", cursor: "default" }}
                  >
                    <div
                      className="skeleton-bar"
                      style={{ width: 17, height: 17, borderRadius: 4, flexShrink: 0 }}
                    />
                    <div className="skeleton-bar" style={{ width: `${w}%`, height: 9 }} />
                  </div>
                ))}
              </div>
            ))}
          </nav>
        </aside>
        <div className="main-area">
          <main
            className="content"
            style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 14,
                color: "var(--muted)",
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  border: "2.5px solid var(--line)",
                  borderTop: "2.5px solid var(--primary)",
                  animation: "shell-spin 0.8s linear infinite",
                }}
              />
              <span style={{ fontSize: 13 }}>Authenticating…</span>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <PageAccessContext.Provider value={accessMap}>
      <div className="app-shell">
        <aside className="sidebar">
          <nav className="nav-list" aria-label="Primary">
            {navGroups.map((group) => (
              <NavSection
                key={group.title}
                title={group.title}
                items={group.items}
                currentPath={router.location.pathname}
              />
            ))}
          </nav>
          {/* <div className="sidebar-links" aria-label="Project links">
            {projectLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Tooltip content={link.label} key={link.href} side="top">
                  <a
                    className="sidebar-link"
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={link.label}
                  >
                    <Icon size={17} />
                  </a>
                </Tooltip>
              );
            })}
          </div> */}
        </aside>
        <div className="main-area">
          <main className="content">
            <Outlet />
          </main>
        </div>
      </div>
    </PageAccessContext.Provider>
  );
}

function canAccess(item: NavItemConfig, accessMap: AccessMap | null): boolean {
  if (accessMap === null) return false; // still loading → hide all until resolved
  if (!item.accessKey) return true;    // no restriction defined → always show
  return accessMap.has(item.accessKey);
}

function navigationGroups(options: {
  hasBinds: boolean;
  hasLlm: boolean;
  hasMcp: boolean;
  hasTraffic: boolean;
  dumpMode: boolean;
  accessMap: AccessMap | null;
}): ReadonlyArray<{ title: string; items: readonly NavItemConfig[] }> {
  const { accessMap } = options;
  const allow = (item: NavItemConfig) => canAccess(item, accessMap);

  const result: Array<{ title: string; items: readonly NavItemConfig[] }> = [];

  // Gateway section
  const gatewayItems = [
    { to: "/", label: "Home", icon: Home, accessKey: "home" },
  ].filter(allow);
  if (gatewayItems.length > 0) {
    result.push({ title: "Gateway", items: gatewayItems });
  }

  if (!options.dumpMode) {
    // LLM section
    const llmItems = (
      options.hasLlm
        ? [
          { to: "/llm/models", label: "Models", icon: Bot, accessKey: "models" },
          { to: "/llm/providers", label: "Providers", icon: Boxes, accessKey: "providers" },
          { to: "/llm/policies", label: "Policies", icon: Bolt, groupStart: true, accessKey: "policies" },
          { to: "/llm/guardrails", label: "Guardrails", icon: Shield, accessKey: "guardrails" },
          { to: "/llm/keys", label: "Virtual API Keys", icon: KeyRound, accessKey: "keys" },
          { to: "/llm/costs", label: "Costs", icon: Coins, accessKey: "costs" },
          { to: "/llm/analytics", label: "Analytics", icon: BarChart3, groupStart: true, accessKey: "analytics" },
          { to: "/llm/logs", label: "Logs", icon: ScrollText, accessKey: "logs" },
          { to: "/llm/client-setup", label: "Client Setup", icon: Cable, groupStart: true, accessKey: "client-setup" },
          { to: "/llm/playground", label: "Chat Playground", icon: Play, accessKey: "playground" },
        ]
        : [
          { to: "/llm/get-started", label: "Get started", icon: Bot, placeholder: true, accessKey: "models" },
        ]
    ).filter(allow);
    if (llmItems.length > 0) {
      result.push({ title: "LLM", items: llmItems });
    }

    // MCP section
    const mcpItems = (
      options.hasMcp
        ? [
          { to: "/mcp/servers", label: "Servers", icon: Server, accessKey: "servers" },
          { to: "/mcp/policies", label: "Policies", icon: ShieldCheck, accessKey: "mcp-policies" },
          { to: "/mcp/playground", label: "Tool Playground", icon: Play, accessKey: "tool-playground" },
        ]
        : [
          { to: "/mcp/get-started", label: "Get started", icon: Server, placeholder: true, accessKey: "servers" },
        ]
    ).filter(allow);
    if (mcpItems.length > 0) {
      result.push({ title: "MCP", items: mcpItems });
    }
  }

  // Traffic section
  const trafficItems = (
    options.dumpMode
      ? [
        { to: "/traffic/listeners", label: "Listeners", icon: Network, accessKey: "listeners" },
        { to: "/traffic/routes", label: "Routes", icon: Route, accessKey: "routes" },
        { to: "/traffic/policies", label: "Policies", icon: ShieldCheck, accessKey: "traffic-policies" },
      ]
      : options.hasTraffic
        ? [
          { to: "/traffic/gateways", label: "Gateways", icon: Network, accessKey: "gateways" },
          ...(options.hasBinds
            ? [{ to: "/traffic/listeners", label: "Listeners", icon: Network, accessKey: "listeners" }]
            : []),
          { to: "/traffic/routes", label: "Routes", icon: Route, accessKey: "routes" },
        ]
        : [
          { to: "/traffic/get-started", label: "Get started", icon: Network, placeholder: true, accessKey: "gateways" },
        ]
  ).filter(allow);
  if (trafficItems.length > 0) {
    result.push({ title: "Traffic", items: trafficItems });
  }

  // Tools section
  const toolItems = (
    options.dumpMode
      ? [{ to: "/cel", label: "CEL Playground", icon: Braces, accessKey: "cel" }]
      : [
        { to: "/cel", label: "CEL Playground", icon: Braces, accessKey: "cel" },
        { to: "/raw-config", label: "Raw Configuration", icon: FileCode2, exact: true, accessKey: "raw-config" },
        { to: "/settings", label: "Settings", icon: SlidersHorizontal, accessKey: "settings" },
      ]
  ).filter(allow);
  if (toolItems.length > 0) {
    result.push({ title: "Tools", items: toolItems });
  }

  return result;
}

function NavSection(props: {
  title: string;
  items: readonly NavItemConfig[];
  currentPath: string;
}) {
  return (
    <>
      <div className="nav-section">{props.title}</div>
      {props.items.map((item) => (
        <NavItem key={item.to} {...item} currentPath={props.currentPath} />
      ))}
    </>
  );
}

function NavItem(props: {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  currentPath: string;
  placeholder?: boolean;
  groupStart?: boolean;
  exact?: boolean;
}) {
  const Icon = props.icon;
  const navigate = useNavigate();
  const active = props.placeholder
    ? false
    : navItemActive(props, props.currentPath);
  if (props.placeholder) {
    return (
      <button
        type="button"
        className={props.groupStart ? "nav-item nav-group-start" : "nav-item"}
        onClick={() => void navigate({ to: props.to })}
      >
        <Icon size={17} />
        <span>{props.label}</span>
      </button>
    );
  }
  return (
    <Link
      to={props.to}
      className={`${active ? "nav-item active" : "nav-item"}${props.groupStart ? " nav-group-start" : ""}`}
    >
      <Icon size={17} />
      <span>{props.label}</span>
    </Link>
  );
}

function navItemActive(item: { to: string; exact?: boolean }, path: string) {
  if (item.to === "/") return path === "/";
  if (item.exact) return path === item.to;
  return path === item.to || path.startsWith(`${item.to}/`);
}
 
