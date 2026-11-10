# Deploying a free BlendUs demo

The whole stack (Astro, Laravel, PostgreSQL + pgvector and Ollama) runs on **one free Oracle Cloud VM**
and is published with **Cloudflare Tunnel**: free HTTPS, no open ports, no certificates to manage.

```
visitor ──https──> Cloudflare ──tunnel──> cloudflared ──> Caddy (proxy:80)
                                                            ├── /api, /storage, /up ──> Laravel (backend:8000)
                                                            └── everything else     ──> Astro   (frontend:4321)
```

Everything is served from a single origin, so there is no CORS and the frontend calls the API with
relative `/api/...` URLs. The same build works with any public URL.

Files involved: `docker-compose.prod.yml`, `deploy/Caddyfile`, `.env.prod.example`,
`smoothies-api/Dockerfile.prod`, `smoothies-api/docker/start-prod.sh`, `blendus-frontend/Dockerfile.prod`.

> Free tiers change. Check Oracle's and Cloudflare's current conditions before you sign up.

## 1. Create the VM (Oracle Cloud Always Free)

1. Sign up at <https://www.oracle.com/cloud/free/>. A card is required for identity verification;
   Always Free resources are not charged. Your **home region cannot be changed later**.
2. *Compute → Instances → Create instance*:
   - **Image:** Canonical Ubuntu 24.04 (aarch64)
   - **Shape:** Ampere `VM.Standard.A1.Flex`, **4 OCPU / 24 GB RAM**
   - **SSH keys:** upload your public key (or download the generated pair)
   - **Boot volume:** 100 GB is plenty (models + images + database)
3. If you get *"Out of capacity"*, try another availability domain or retry later.

No firewall/ingress rules are needed: the tunnel only makes outbound connections.

## 2. Install Docker and get the code

```bash
ssh ubuntu@<VM_PUBLIC_IP>

curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER && newgrp docker

git clone https://github.com/<your-user>/BlendUs.git
cd BlendUs
```

## 3. Configure secrets

```bash
cp .env.prod.example .env.prod

# APP_KEY
docker run --rm php:8.2-cli php -r "echo 'base64:'.base64_encode(random_bytes(32)).PHP_EOL;"
# DB_PASSWORD
openssl rand -hex 24

nano .env.prod   # paste both values
```

`.env.prod` is git-ignored. Never commit it.

## 4. Start the demo

A short alias saves a lot of typing:

```bash
alias dc='docker compose -f docker-compose.prod.yml --env-file .env.prod'
```

### Option 1: quick tunnel (no account, no domain)

```bash
dc --profile quick up -d --build
dc logs -f backend            # wait for "Server running on [http://0.0.0.0:8000]"
dc logs tunnel-quick | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com'
```

Open that URL: the demo is live. The first start takes a while because it builds the images and
downloads the AI models (~1.6 GB).

The `trycloudflare.com` URL **changes every time the `tunnel-quick` container restarts**, and
quick tunnels come with no uptime guarantee. Fine for showing the app, not for a link you hand out for weeks.

### Option 2: your own domain (stable URL)

Requires a domain whose DNS is managed by Cloudflare (free plan).

1. Cloudflare dashboard → *Zero Trust → Networks → Tunnels → Create a tunnel* (type **Cloudflared**).
2. Copy the **token** from the install command and set it as `CLOUDFLARE_TUNNEL_TOKEN` in `.env.prod`.
3. *Public hostname*: e.g. `blendus.yourdomain.com` → service **HTTP** → `proxy:80`.
4. Set `PUBLIC_URL=https://blendus.yourdomain.com` in `.env.prod`, then:

```bash
dc --profile tunnel up -d --build
```

## Demo accounts

The first boot seeds sample users, posts and products:

| Email | Password |
|---|---|
| `test@example.com` | `password` |
| `nico@test.com` | `password123` |
| `paco@test.com` | `password123` |

These passwords are public. Tell visitors this is a demo.

## Day-to-day

```bash
git pull && dc up -d --build                                  # deploy a new version
dc ps                                                         # status
dc logs -f backend                                            # API logs (Laravel logs to stderr)
dc exec backend php artisan migrate:fresh --seed --force      # reset demo data
dc exec postgres pg_dump -U blendus blendus > backup.sql      # backup the database
curl -s localhost:8080/up                                     # health check from the VM
```

Add `--profile quick` or `--profile tunnel` to `up` so the tunnel keeps running.

## Stripe (optional)

Use **test mode** keys only (`STRIPE_KEY`, `STRIPE_SECRET`). For payment confirmation, create a webhook in
the Stripe dashboard pointing to `https://<your-url>/api/stripe/webhook` with the events
`checkout.session.completed` and `checkout.session.expired`, and copy its signing secret to
`STRIPE_WEBHOOK_SECRET`. Test card: `4242 4242 4242 4242`.

With the quick tunnel the URL changes on restart, so the webhook would have to be updated each time.

## Things to know

- **Idle reclamation:** Oracle may reclaim Always Free instances that stay almost idle for days.
  Check your account's current policy.
- **AI speed:** `llama3.2:1b` runs on CPU. Expect a few seconds per answer; models stay loaded for
  24 h (`OLLAMA_KEEP_ALIVE`), so only the first request after a restart is slow.
- **Demo-grade server:** the API uses PHP's built-in server (`artisan serve` with 8 workers) and
  installs dev dependencies (the seeders need Faker). Good enough for a demo, not for real traffic.
- **Uploads** live in the `uploads` Docker volume and survive rebuilds; `docker compose down -v` deletes them,
  along with the database.
