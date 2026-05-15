# BlendUs 🍹 - Getting Started Guide

Hello! Welcome to **BlendUs**, the ultimate social network for smoothie lovers. We have optimized the setup so you can get it running almost automatically.

## Launching (Dockerized) 🐳

The project (Frontend, Backend, Database, and AI) runs inside containers and auto-configures itself on startup.

**Step 1 - Start everything:**
```bash
docker compose up -d
```

**Step 2 - AI Configuration (First time only):**
AI models are downloaded automatically in the background. Once the system is ready, just run this command so the AI can analyze existing recipes:

```bash
# Generate vectors for the recommendation system (do this 5 min after startup)
docker exec blendus-backend php artisan smoothies:generate-embeddings
```

## Accessing the site
*   **Frontend:** [http://localhost:4321](http://localhost:4321)
*   **API / Backend:** [http://localhost:8000](http://localhost:8000)

---

## ⚠️ If you change PC or want to reset

If you need to clear the database and start fresh with test data, simply run:

```bash
docker exec blendus-backend php artisan migrate:fresh --seed
```

---

## What can you do in BlendUs? (Features)

*   **Smoothie Community:** Explore an infinite feed with real recipes and spectacular photos.
*   **Personalized Ranking (AI):** Your "For You" feed learns from your likes and saves to recommend what you love most.
*   **AI Sommelier 🍷:** Describe your mood and Chef Enrique will suggest the perfect smoothie.
*   **AI Recipe Generator ✨:** Write an idea and the AI will create the complete recipe for you.
*   **AI Cooking Assistant 👨‍🍳:** Interactive step-by-step guide to cook your smoothies in real-time.
*   **Messaging Hub (Responsive) 💬:** Direct chats and groups optimized for mobile with fluid navigation.
*   **100% Responsive Design 📱:** The entire site is "Mobile First," with menus and navigation optimized for smartphones.

---

## 📄 Technical Documentation

The project includes a documentation PDF detailing:
*   Astro + Laravel + Docker architecture.
*   Database diagrams and data flow.
*   Testing Strategy (Manual and E2E with Playwright).
*   Maintenance plan and future improvements.

---

## Activating Stripe Payments 💳

To test the **Marketplace** and payments, follow these steps:

1.  **Get your API Keys:**
    *   Go to the [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys) (Test Mode).
    *   Copy your **Publishable key** to `STRIPE_KEY` in your `.env`.
    *   Copy your **Secret key** to `STRIPE_SECRET` in your `.env`.

2.  **Configure Webhooks (Local testing):**
    *   Install the [Stripe CLI](https://stripe.com/docs/stripe-cli).
    *   Run `stripe login` to authenticate.
    *   Run the listener: 
        ```bash
        stripe listen --forward-to localhost:8000/api/stripe/webhook
        ```
    *   The CLI will output a "webhook signing secret" (starts with `whsec_`). Copy it to `STRIPE_WEBHOOK_SECRET` in your `.env`.

3.  **Test a Purchase:**
    *   Go to the Marketplace, select a product, and click "Buy".
    *   Use the **4242 4242 4242 4242** test card to complete the transaction.