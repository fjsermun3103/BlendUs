# Demo online gratuita de BlendUs (sin tarjeta)

Cada parte de la aplicación se aloja en un servicio distinto con plan gratuito. Ninguno pide tarjeta de crédito.

```
navegador ──> Vercel (frontend Astro)
   │
   └── /api ──> Render (API Laravel) ──> Neon (PostgreSQL + pgvector)
```

| Parte | Servicio | Límites del plan gratuito |
|---|---|---|
| Frontend | [Vercel](https://vercel.com) (Hobby) | Uso personal, no comercial |
| API | [Render](https://render.com) (Free) | 512 MB de RAM; se duerme tras 15 min sin visitas |
| Base de datos | [Neon](https://neon.tech) (Free) | 0,5 GB; se pausa tras unos minutos sin uso y despierta sola |

> Las condiciones de los planes gratuitos cambian. Comprueba al registrarte que ninguno te pide tarjeta.

## Qué cambia respecto a la versión local

La versión online es una **demo sin IA**. Los modelos de Ollama necesitan varios GB de RAM y no caben en ningún hosting gratuito,
así que la demo se publica con la IA desactivada:

| Funcionalidad | En la demo |
|---|---|
| Sommelier IA, generador de recetas y asistente de cocina | Muestran un aviso explicando por qué no están disponibles |
| Feed "For You" | Muestra los últimos smoothies, con un aviso |
| Pago del marketplace | Solo funciona si añades claves de Stripe en Render (ver [A tener en cuenta](#a-tener-en-cuenta)) |
| Todo lo demás (feed, posts, likes, comentarios, chats, perfiles, catálogo) | Funciona con normalidad |

Las fotos que suben los usuarios se guardan en la base de datos, porque Render borra el disco cada vez que la API se duerme.

Todo esto se controla con variables de entorno, sin tocar el código:

| Variable | Dónde | Valor en la demo |
|---|---|---|
| `AI_ENABLED` | API | `false` (ya viene así en el `Dockerfile` de producción) |
| `IMAGES_IN_DATABASE` | API | `true` (ya viene así en el `Dockerfile` de producción) |
| `PUBLIC_AI_ENABLED` | Frontend | `false` (se configura en Vercel) |

En local, con `docker compose up`, la IA sigue funcionando como siempre.

## 1. Base de datos (Neon)

1. Regístrate en <https://neon.tech> y crea un proyecto en la región **AWS Europe Central 1 (Frankfurt)**, la misma que usaremos en Render.
2. En **Connect**, **desactiva "Connection pooling"** y copia la cadena de conexión. Tiene esta forma:
   `postgresql://neondb_owner:xxxx@ep-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require`

Esa es tu `DB_URL`. La API crea las tablas y carga los datos de ejemplo la primera vez que arranca.

## 2. API (Render)

1. Genera una clave para Laravel (`APP_KEY`) en tu PC:
   ```bash
   docker run --rm php:8.2-cli php -r "echo 'base64:'.base64_encode(random_bytes(32)).PHP_EOL;"
   ```
2. Regístrate en <https://render.com> con tu cuenta de GitHub y crea un **New → Web Service** a partir del repositorio **BlendUs**:

   | Campo | Valor |
   |---|---|
   | Name | `blendus-api` |
   | Language | Docker |
   | Branch | `main` |
   | Region | Frankfurt (EU Central) |
   | Root Directory | `smoothies-api` |
   | Instance Type | **Free** |

3. En **Environment Variables**, añade:

   | Variable | Valor |
   |---|---|
   | `APP_KEY` | La clave del paso 1 |
   | `DB_URL` | La cadena de conexión de Neon |

4. En **Advanced → Health Check Path**, escribe `/up`.
5. Pulsa **Deploy Web Service**. El primer despliegue tarda unos 5 minutos. Cuando en los logs aparezca
   `Server running on [http://0.0.0.0:10000]`, la API está lista.

Render te da una URL del tipo `https://blendus-api.onrender.com`; si el nombre está ocupado, añade un sufijo.
Compruébala abriendo `https://blendus-api.onrender.com/api/posts`: debería devolver los posts en JSON.

## 3. Frontend (Vercel)

1. Regístrate en <https://vercel.com> con tu cuenta de GitHub y ve a **Add New → Project** → importa el repositorio **BlendUs**.
2. Antes del primer despliegue, configura:
   - **Root Directory:** `blendus-frontend`
   - **Framework Preset:** Astro (se detecta solo)
   - **Environment Variables:**

     | Variable | Valor | Tipo |
     |---|---|---|
     | `PUBLIC_API_URL` | La URL de Render, por ejemplo `https://blendus-api.onrender.com` | **Config** |
     | `PUBLIC_AI_ENABLED` | `false` | **Config** |

3. Pulsa **Deploy**. Obtendrás una URL del tipo `https://blendus-xxxx.vercel.app`.

Notas sobre estas variables:

- Las variables `PUBLIC_*` se incluyen al compilar: si las cambias, vuelve a desplegar (*Deployments → ⋯ → Redeploy*).
- **Créalas como tipo Config, no Secret.** No son secretos: el navegador necesita conocer la URL de la API para llamarla, y Astro
  solo pasa al navegador las variables que empiezan por `PUBLIC_`. Si Vercel avisa de que el prefijo las expone, es lo esperado.
  Una variable creada como Secret no se puede convertir: bórrala y créala de nuevo como Config.
- Nunca pongas valores secretos (`APP_KEY`, `DB_URL`, claves de Stripe) en Vercel ni con prefijo `PUBLIC_`: van en Render.

## 4. Conectar la API con el frontend

En Render, ve a **Environment** y añade estas variables con la URL de Vercel (sin `/` al final):

| Variable | Valor |
|---|---|
| `CORS_ALLOWED_ORIGINS` | `https://blendus-xxxx.vercel.app` |
| `FRONTEND_URL` | `https://blendus-xxxx.vercel.app` |

Guarda los cambios: Render vuelve a desplegar la API automáticamente. Al terminar, abre la URL de Vercel y la demo estará online.

Solo ese origen exacto puede llamar a la API. Las *preview deployments* de Vercel tienen otras URLs; si quieres usarlas,
añádelas a `CORS_ALLOWED_ORIGINS` separadas por comas.

## Cuentas de prueba

| Email | Contraseña |
|---|---|
| `test@example.com` | `password` |
| `nico@test.com` | `password123` |
| `paco@test.com` | `password123` |

Estas contraseñas son públicas: deja claro a quien la visite que es una demo.

## Publicar nuevas versiones

Cada `git push` a `main` vuelve a desplegar automáticamente el frontend (Vercel) y la API (Render).
Las migraciones nuevas se ejecutan solas al arrancar la API.

Para **reiniciar los datos de la demo**, borra y vuelve a crear la base de datos en Neon (*Branches* o *Databases*) y reinicia
el servicio en Render (*Manual Deploy → Restart service*): al arrancar vuelve a cargar los datos de ejemplo.

## A tener en cuenta

- **La primera visita tras un rato sin uso es lenta.** Render duerme la API tras 15 minutos sin tráfico y tarda alrededor
  de un minuto en despertar; mientras tanto, la web carga pero los datos tardan en aparecer.
  Antes de enseñar la demo, abre la URL de la API para despertarla.
- **Espacio de la base de datos:** las fotos subidas ocupan espacio en Neon (máximo 5 MB cada una, dentro de los 0,5 GB del plan gratuito).
- **Stripe (opcional):** añade en Render `STRIPE_KEY`, `STRIPE_SECRET` y `STRIPE_WEBHOOK_SECRET` (modo de prueba).
  El webhook es `https://<tu-api>.onrender.com/api/stripe/webhook`.

## Probar la imagen de producción en local

```bash
docker build -t blendus-api smoothies-api
docker run --rm -p 8000:8000 -e APP_KEY=base64:... -e DB_URL="postgresql://..." blendus-api
```
