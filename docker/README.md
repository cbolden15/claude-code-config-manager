# CCM Docker Deployment

This directory contains Docker configuration for deploying CCM Server to your homelab.

## Quick Start

### Local Development Build

```bash
# From project root
cd docker
docker-compose up --build
```

Access at http://localhost:3000

### Production Deployment (Homelab)

1. **SSH to homelab:**
   ```bash
   ssh cbolden15@homelab
   ```

2. **Create deployment directory:**
   ```bash
   sudo mkdir -p /opt/ccm/data
   sudo chown -R 1001:1001 /opt/ccm/data
   ```

3. **Copy files to homelab:**
   ```bash
   # From your local machine
   scp -r . cbolden15@homelab:/opt/ccm/
   ```

4. **Deploy with docker-compose:**
   ```bash
   cd /opt/ccm
   docker-compose -f docker/docker-compose.homelab.yml up -d
   ```

5. **Configure Nginx Proxy Manager:**
   - Add new Proxy Host
   - Domain: `ccm.homelab.bream-python.ts.net`
   - Forward to: `ccm-server:3000`
   - Enable SSL with Let's Encrypt (or use Tailscale certs)

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `file:/app/data/ccm.db` | SQLite database path |
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `production` | Node environment |

### Volume Mounts

| Path | Description |
|------|-------------|
| `/app/data` | SQLite database storage |

## CLI Configuration

After deploying, configure the CLI on your laptop/desktop:

```bash
# Set server URL to homelab
ccm config --server-url https://ccm.homelab.bream-python.ts.net

# Set machine name
ccm config --machine calebs-macbook-pro

# Verify connection
ccm config
```

## Updating

```bash
# Pull latest changes
cd /opt/ccm
git pull

# Rebuild and restart
docker-compose -f docker/docker-compose.homelab.yml up -d --build
```

## Backup

```bash
# Backup database
docker cp ccm-server:/app/data/ccm.db ./ccm-backup-$(date +%Y%m%d).db

# Or with volume
cp /opt/ccm/data/ccm.db /backup/ccm-$(date +%Y%m%d).db
```

## Troubleshooting

### View logs
```bash
docker logs ccm-server -f
```

### Check health
```bash
curl http://localhost:3000/api/health
```

### Enter container
```bash
docker exec -it ccm-server sh
```

### Reset database
```bash
docker-compose down
rm /opt/ccm/data/ccm.db
docker-compose up -d
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Homelab (homelab.bream-python.ts.net)                         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Nginx Proxy Manager                                        ││
│  │  ┌──────────────────────────────────────────────────────┐  ││
│  │  │  ccm.homelab.bream-python.ts.net → ccm-server:3000   │  ││
│  │  └──────────────────────────────────────────────────────┘  ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Docker: ccm-server                                         ││
│  │  ┌───────────────┐  ┌───────────────────────────────────┐  ││
│  │  │  Next.js App  │  │  SQLite (/app/data/ccm.db)        │  ││
│  │  │  Port 3000    │  │  Mounted: /opt/ccm/data           │  ││
│  │  └───────────────┘  └───────────────────────────────────┘  ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
          ▲
          │ Tailscale VPN
          ▼
┌─────────────────────────────────────────┐
│  Laptop (calebs-macbook-pro)            │
│  ┌───────────────────────────────────┐  │
│  │  CCM CLI                          │  │
│  │  ccm init, ccm sync, etc.         │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```
