<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Stripe\Exception\SignatureVerificationException;
use Stripe\Webhook;

/**
 * Receives Stripe events and keeps orders in sync with Checkout sessions.
 * Local testing: `stripe listen --forward-to localhost:8000/api/stripe/webhook`.
 */
class StripeWebhookController extends Controller
{
    public function handle(Request $request): JsonResponse
    {
        try {
            $event = Webhook::constructEvent(
                $request->getContent(),
                (string) $request->header('Stripe-Signature'),
                (string) config('services.stripe.webhook_secret'),
            );
        } catch (\UnexpectedValueException|SignatureVerificationException $e) {
            Log::warning('Rejected Stripe webhook: '.$e->getMessage());

            return response()->json(['message' => 'Invalid webhook payload or signature.'], 400);
        }

        $session = $event->data->object;

        match ($event->type) {
            'checkout.session.completed',
            'checkout.session.async_payment_succeeded' => $session->payment_status === 'paid'
                ? $this->updateOrder($session, 'paid')
                : null,
            'checkout.session.async_payment_failed',
            'checkout.session.expired' => $this->updateOrder($session, 'cancelled'),
            default => null,
        };

        // Always 200 for events we don't handle, otherwise Stripe keeps retrying them.
        return response()->json(['received' => true]);
    }

    private function updateOrder(object $session, string $status): void
    {
        $order = Order::where('stripe_session_id', $session->id)->first()
            ?? Order::find($session->metadata->order_id ?? null);

        if (! $order) {
            Log::warning("Stripe webhook for unknown checkout session {$session->id}");

            return;
        }

        // Never downgrade an order that is already paid (events can arrive out of order).
        if ($order->status !== 'paid') {
            $order->update(['status' => $status]);
        }
    }
}
