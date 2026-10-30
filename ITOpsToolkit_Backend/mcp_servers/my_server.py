from fastmcp import FastMCP
from fastmcp.server.auth.oidc_proxy import OIDCProxy

auth = OIDCProxy(
    # Provider's configuration URL
    config_url = "https://keycloak.intelligentservicedeliveryplatform.com:32123/realms/AIOT/.well-known/openid-configuration",

    # Your registered app credentials
    client_id = "aiot-demo",
    client_secret = "9zpjveqbOEf7KZZgHBDjLuehhOWQU560",

    # Your FastMCP server's public URL
    base_url = "https://mcp.intelligentservicedeliveryplatform.com",

    # Optional: customize the callback path (default is "/auth/callback")
    # redirect_path="/custom/callback",
)

mcp = FastMCP("My MCP Server", auth = auth)

@mcp.tool
def greet(name: str) -> str:
    return f"Hello, {name}!"

if __name__ == "__main__":
    mcp.run(transport = "http", port = 8000)
