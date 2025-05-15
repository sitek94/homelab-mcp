# Homelab MCP

MCP server for helping with managing homelab running on a VPS.

## Usage

- Requires [Bun](https://bun.sh/)
- Install: `bun install`
- Build: `bun run build`

Add the following to your `mcp.json`:

```json
{
  "homelab-mcp": {
    "name": "Homelab MCP",
    "command": "node",
    "args": [
      "<PATH_TO_THIS_REPO>/build/index.mjs"
    ],
    "env": {
        "VPS_HOST": "",
        "VPS_PORT": "",
        "VPS_USERNAME": "",
        "VPS_PRIVATE_KEY_PATH": "",
        "HOMELAB_DIR": "",
        "POSTGRES_USER": "",
        "POSTGRES_PASSWORD": "",
        "POSTGRES_HOST": "",
        "POSTGRES_PORT": "",
        "POSTGRES_DATABASE": "",
        "POSTGRES_SCHEMA_PATH": ""
    }
  }
}
```

## Development

- Watch: `bun run build:watch`
- Inspector: `bun inspector`

## Postgres Connection Flow via 

```mermaid
sequenceDiagram
  participant MCP_Server_macOS as MCP Server (macOS)
  participant Cloudflared_Client_macOS as Cloudflare Client (macOS)
  participant Cloudflare_Edge as Cloudflare Edge
  participant Cloudflared_Daemon_VPS as Cloudflared (VPS)
  participant Postgres_VPS as PostgreSQL (VPS)

  MCP_Server_macOS->>Cloudflared_Client_macOS: 1. SQL Query (via pg library to localhost)
  Cloudflared_Client_macOS->>Cloudflare_Edge: 2. Encrypted TCP connection (for pg.mydomain.com)
  Cloudflare_Edge->>Cloudflared_Daemon_VPS: 3. Encrypted TCP connection (via persistent tunnel)
  Cloudflared_Daemon_VPS->>Postgres_VPS: 4. TCP connection (to postgres:5432 on Docker network)
  Postgres_VPS-->>Cloudflared_Daemon_VPS: 5. SQL Result
  Cloudflared_Daemon_VPS-->>Cloudflare_Edge: 6. Encrypted SQL Result
  Cloudflare_Edge-->>Cloudflared_Client_macOS: 7. Encrypted SQL Result
  Cloudflared_Client_macOS-->>MCP_Server_macOS: 8. SQL Result (from localhost)
```
