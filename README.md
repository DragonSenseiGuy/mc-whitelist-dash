# Minecraft Server Admin Dashboard

A Next.js dashboard for managing a Minecraft server remotely via SSH. Manage whitelists, monitor server status, view online players, and restart containers — all from a web UI.

## Architecture

```
[Browser] → [VPS (Dokploy + Traefik)] → [Remote Host (Tailscale)]
                 ↑ This dashboard              ↑ Minecraft server
                   SSHes into the host to run docker/rcon commands
```

- **VPS**: Runs this dashboard inside Docker, managed by Dokploy with Traefik as reverse proxy
- **Remote Host** (e.g. Raspberry Pi): Runs the Minecraft server (Paper + Waterfall) via Docker Compose, accessible over Tailscale

## Tech Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- SQLite (via better-sqlite3) for admin accounts
- node-ssh for remote server management
- Docker multi-stage build (standalone output)

## Deploying on Dokploy

### Prerequisites

- A VPS running [Dokploy](https://dokploy.com) with Traefik configured
- A remote host (e.g. Raspberry Pi) running the Minecraft server via Docker
- [Tailscale](https://tailscale.com) installed on **both** the VPS and the remote host
- DNS A record for your domain pointing to your VPS IP

### Step 1: Generate an SSH Key and Add It to the Remote Host

The dashboard SSHes into the remote host to run commands. You need to create a dedicated key pair and authorize it.

#### 1a. Generate the key on your VPS

```bash
# SSH into your VPS
ssh your-user@your-vps-ip

# Generate a dedicated key pair (no passphrase — press Enter when prompted)
ssh-keygen -t ed25519 -C "mc-dashboard" -f /tmp/mc-dashboard-key

# This creates two files:
#   /tmp/mc-dashboard-key       ← private key (stays on VPS)
#   /tmp/mc-dashboard-key.pub   ← public key (goes on remote host)
```

#### 1b. Copy the public key to the remote host

```bash
# Option A: Use ssh-copy-id (easiest, if you can already SSH into the host)
ssh-copy-id -i /tmp/mc-dashboard-key.pub your-user@<TAILSCALE_IP>

# Option B: Do it manually
# First, print the public key:
cat /tmp/mc-dashboard-key.pub

# Then SSH into the remote host and add it:
ssh your-user@<TAILSCALE_IP>
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo "<paste the public key here>" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
exit
```

#### 1c. Store the private key on the VPS

```bash
# Create a directory for the key
sudo mkdir -p /etc/mc-dashboard

# Move the private key into place
sudo mv /tmp/mc-dashboard-key /etc/mc-dashboard/id_ed25519
sudo chmod 600 /etc/mc-dashboard/id_ed25519

# Clean up the public key from /tmp (it's already on the remote host)
rm /tmp/mc-dashboard-key.pub
```

#### 1d. Verify the connection

```bash
ssh -i /etc/mc-dashboard/id_ed25519 your-user@<TAILSCALE_IP>
# You should get a shell without being asked for a password
```

### Step 2: Create the Service in Dokploy

1. Open Dokploy dashboard → **Projects** → **Create Project** (e.g. "MC Admin")
2. Inside the project → **Add Service** → **Compose**
3. Connect your GitHub repo or paste the `docker-compose.yml`

### Step 3: Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values, or set them in Dokploy's **Environment** tab:

| Variable | Value | Description |
|---|---|---|
| `MC_SSH_HOST` | *(your Tailscale IP)* | Remote host's Tailscale IP |
| `MC_SSH_USER` | `server` | SSH username on the remote host |
| `MC_SSH_KEY_PATH` | `/etc/mc-dashboard/id_ed25519` | Path inside the container |
| `ADMIN_JWT_SECRET` | *(generate one)* | Secret for JWT auth |
| `SSH_KEY_PATH` | `/etc/mc-dashboard/id_ed25519` | Path on the **VPS host** for the volume mount |
| `DASHBOARD_DOMAIN` | `mc-admin.example.com` | Your domain for Traefik routing |

Generate a JWT secret:

```bash
openssl rand -hex 32
```

### Step 4: Tailscale Connectivity

Since the container needs to reach the remote host's Tailscale IP, the `docker-compose.yml` includes `extra_hosts` to route through the VPS host's network:

```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

Make sure Tailscale is running on the VPS and the remote host is reachable:

```bash
# On the VPS
ping <TAILSCALE_IP>

# If unreachable, ensure IP forwarding is enabled
sudo sysctl -w net.ipv4.ip_forward=1
sudo tailscale set --accept-routes
```

### Step 5: Domain & SSL (Traefik)

The `docker-compose.yml` uses the `DASHBOARD_DOMAIN` env var for Traefik routing. Make sure:

1. Your DNS A record points to your VPS IP
2. In Dokploy, **disable the built-in proxy/domain** for this service since Traefik labels handle routing directly

### Step 6: Deploy

Hit **Deploy** in Dokploy. Once running, visit your domain.

On first visit, you'll be redirected to `/setup` to create your admin account.

## Troubleshooting

| Issue | Fix |
|---|---|
| SSH connection refused | Verify key: `ssh -i /etc/mc-dashboard/id_ed25519 your-user@<TAILSCALE_IP>` |
| Can't reach Tailscale IP | Check `tailscale status` on VPS, ensure remote host is online |
| Container won't start | `docker logs mc-admin-dashboard` |
| 502 Bad Gateway | Check Traefik logs, ensure container is on the `traefik` network |
| Database errors | Ensure `./data` directory exists and is writable |

## Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Minecraft Server Setup

The dashboard expects the Minecraft server on the remote host to be running via Docker Compose with these container names:

- `minecraft-minecraft-1` — Paper server (with RCON enabled)
- `minecraft-waterfall-1` — Waterfall proxy
