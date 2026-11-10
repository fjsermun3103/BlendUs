# Free BlendUs demo in the cloud (no credit card)

Each part of the app runs on a different free service. None of them asks for a card.

```
browser ──> Vercel (Astro frontend)
   │
   └── /api, /storage ──> Hugging Face Space (Laravel API + Ollama) ──> Neon (PostgreSQL + pgvector)
```

| Part | Service | Free plan limits to know |
|---|---|---|
| Frontend | [Vercel](https://vercel.com) (Hobby) | Personal, non-commercial use |
| API + AI models | [Hugging Face Spaces](https://huggingface.co/spaces) (CPU basic) | Sleeps after ~2 days without visits; disk is wiped on every restart |
| Database | [Neon](https://neon.tech) (Free) | 0.5 GB; the database pauses after a few idle minutes and wakes up on the next query |

> Free plans change. Check each service's current conditions when you sign up.

Files involved: `deploy/hf-space/Dockerfile`, `deploy/hf-space/README.md`, `smoothies-api/docker/start-hf.sh`.
The Space clones the API code from this GitHub repository (`main` branch) when it builds, so **push your changes to GitHub first**.
The repository must be public for the Space to clone it.

## 1. Database (Neon)

1. Sign up at <https://neon.tech> and create a project. Pick region **AWS US East (N. Virginia)**, close to where Spaces run.
2. In *Connect*, **turn off "Connection pooling"** and copy the connection string. It looks like:
   `postgresql://neondb_owner:xxxx@ep-xxxx.us-east-1.aws.neon.tech/neondb?sslmode=require`

That is your `DB_URL`. The API creates the tables, enables pgvector and loads the demo data on its first start.

## 2. API (Hugging Face Space)

1. Sign up at <https://huggingface.co> and create a Space (*New Space*):
   - **Name:** for example `blendus-api`
   - **SDK:** Docker → *Blank*
   - **Hardware:** CPU basic (free)
   - **Visibility:** Public (the frontend must be able to call it)
2. *Files → Add file → Upload files*: upload **`deploy/hf-space/Dockerfile`** and **`deploy/hf-space/README.md`** from this repository.
   They replace the default ones and must stay at the root of the Space.
3. *Settings → Variables and secrets*, add:

   | Name | Type | Value |
   |---|---|---|
   | `APP_KEY` | Secret | Generate it with `docker run --rm php:8.2-cli php -r "echo 'base64:'.base64_encode(random_bytes(32)).PHP_EOL;"` |
   | `DB_URL` | Secret | The Neon connection string |
   | `APP_URL` | Variable | `https://<hf-user>-blendus-api.hf.space` (the Space URL, see below) |

4. The Space builds by itself. The first build takes 10–15 minutes because it downloads the AI models (~1.6 GB).
   The *Logs* tab shows `Server running on [http://0.0.0.0:7860]` when it is ready.

The Space's own URL is `https://<hf-user>-<space-name>.hf.space` (in lowercase; dots and underscores become hyphens).
Check it at `https://<hf-user>-blendus-api.hf.space/up`, which should return a green "Application up" page.

## 3. Frontend (Vercel)

1. Sign up at <https://vercel.com> with your GitHub account and *Add New → Project* → import this repository.
2. Settings before the first deploy:
   - **Root Directory:** `blendus-frontend`
   - **Framework Preset:** Astro (detected automatically)
   - **Environment Variables:** `PUBLIC_API_URL` = `https://<hf-user>-blendus-api.hf.space` (no trailing slash)
3. *Deploy*. You get a URL like `https://blendus-xxxx.vercel.app`.

`PUBLIC_API_URL` is baked in at build time: if you change it, redeploy.

## 4. Connect the API to the frontend

Back in the Space, *Settings → Variables and secrets*, add two variables with the Vercel URL (no trailing slash):

| Name | Value |
|---|---|
| `CORS_ALLOWED_ORIGINS` | `https://blendus-xxxx.vercel.app` |
| `FRONTEND_URL` | `https://blendus-xxxx.vercel.app` |

Then *Settings → Restart this Space*. Open the Vercel URL: the demo is live.

Only that exact origin may call the API. Vercel *preview* deployments get other URLs; add them to
`CORS_ALLOWED_ORIGINS` (comma separated) if you want to use them.

## Demo accounts

| Email | Password |
|---|---|
| `test@example.com` | `password` |
| `nico@test.com` | `password123` |
| `paco@test.com` | `password123` |

These passwords are public. Tell visitors this is a demo.

## Deploying new versions

- **Frontend:** every push to `main` redeploys Vercel automatically.
- **API:** push to `main`, then in the Space *Settings → Factory rebuild*. A normal restart does **not** pick up new commits.
- **Database changes:** new migrations run on every start of the Space.
- **Reset the demo data:** delete and recreate the Neon database (or the tables). The next start of the Space seeds it again.

## Things to know

- **Uploaded photos are temporary.** The Space disk is wiped on every restart, so pictures that visitors upload
  disappear (their posts stay, with a broken image). The demo data uses images bundled with the frontend, which are never lost.
- **First visit after a pause is slow.** A sleeping Space takes a minute or two to wake up, and Neon a second or so.
  The first AI request after that also has to load the model.
- **AI speed:** the models run on 2 shared CPUs. Expect around 10 seconds per AI answer.
- **Stripe (optional):** add `STRIPE_KEY`, `STRIPE_SECRET` and `STRIPE_WEBHOOK_SECRET` (test mode) as Space secrets.
  The webhook URL is `https://<hf-user>-blendus-api.hf.space/api/stripe/webhook`.

## Testing the Space image locally

```bash
docker build -f deploy/hf-space/Dockerfile --build-context code=./smoothies-api -t blendus-hf deploy/hf-space
docker run --rm -p 7860:7860 -e APP_KEY=base64:... -e DB_URL="postgresql://..." blendus-hf
```

`--build-context code=...` uses your working copy instead of cloning GitHub.
