<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Stripe\Stripe;
use Tests\TestCase;

class MarketplaceTest extends TestCase
{
    use RefreshDatabase;

    private function product(array $attrs = []): Product
    {
        return Product::create(array_merge([
            'name' => 'Blender Pro',
            'description' => 'A powerful blender',
            'price_cents' => 4999,
            'active' => true,
        ], $attrs));
    }

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
        // Point the Stripe SDK at a closed port so no request ever leaves the machine.
        Stripe::$apiBase = 'http://127.0.0.1:9';
    }

    public function test_only_active_products_are_listed(): void
    {
        $this->product(['name' => 'Visible']);
        $this->product(['name' => 'Hidden', 'active' => false]);

        $this->getJson('/api/marketplace/products')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Visible');
    }

    public function test_inactive_product_detail_returns_404(): void
    {
        $active = $this->product();
        $inactive = $this->product(['active' => false]);

        $this->getJson("/api/marketplace/products/{$active->id}")->assertOk()->assertJsonPath('data.price_cents', 4999);
        $this->getJson("/api/marketplace/products/{$inactive->id}")->assertNotFound();
    }

    public function test_checkout_requires_authentication(): void
    {
        $product = $this->product();

        $this->postJson("/api/marketplace/products/{$product->id}/checkout")->assertUnauthorized();
    }

    public function test_failed_stripe_checkout_does_not_leave_orphan_orders(): void
    {
        $this->signIn();
        $product = $this->product();

        $response = $this->postJson("/api/marketplace/products/{$product->id}/checkout");

        $this->assertGreaterThanOrEqual(500, $response->status());
        $this->assertSame(0, Order::count(), 'An order was persisted even though Stripe checkout failed');
    }

    public function test_stripe_webhook_rejects_unsigned_calls(): void
    {
        // Without a valid signature the endpoint should reject the call (400), not crash (500).
        $this->postJson('/api/stripe/webhook', ['type' => 'checkout.session.completed'])
            ->assertStatus(400);
    }

    /** Sends a webhook signed exactly like Stripe does (t=..., v1=HMAC-SHA256). */
    private function sendSignedWebhook(string $type, array $session, string $secret = 'whsec_test')
    {
        $payload = json_encode([
            'id' => 'evt_test',
            'object' => 'event',
            'type' => $type,
            'data' => ['object' => array_merge(['object' => 'checkout.session'], $session)],
        ]);
        $timestamp = time();
        $signature = hash_hmac('sha256', "{$timestamp}.{$payload}", $secret);

        return $this->call('POST', '/api/stripe/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_STRIPE_SIGNATURE' => "t={$timestamp},v1={$signature}",
        ], $payload);
    }

    private function pendingOrder(): Order
    {
        $product = $this->product();

        return Order::create([
            'user_id' => \App\Models\User::factory()->create()->id,
            'product_id' => $product->id,
            'stripe_session_id' => 'cs_test_123',
            'status' => 'pending',
            'total_cents' => $product->price_cents,
        ]);
    }

    public function test_completed_checkout_marks_the_order_as_paid(): void
    {
        $order = $this->pendingOrder();

        $this->sendSignedWebhook('checkout.session.completed', [
            'id' => 'cs_test_123',
            'payment_status' => 'paid',
            'metadata' => ['order_id' => $order->id],
        ])->assertOk();

        $this->assertSame('paid', $order->fresh()->status);
    }

    public function test_expired_checkout_cancels_the_order(): void
    {
        $order = $this->pendingOrder();

        $this->sendSignedWebhook('checkout.session.expired', ['id' => 'cs_test_123', 'payment_status' => 'unpaid'])
            ->assertOk();

        $this->assertSame('cancelled', $order->fresh()->status);
    }

    public function test_webhook_signed_with_another_secret_is_rejected(): void
    {
        $order = $this->pendingOrder();

        $this->sendSignedWebhook('checkout.session.completed', [
            'id' => 'cs_test_123',
            'payment_status' => 'paid',
        ], secret: 'whsec_attacker')->assertStatus(400);

        $this->assertSame('pending', $order->fresh()->status);
    }
}
