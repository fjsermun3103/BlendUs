<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Stripe\Checkout\Session;
use Stripe\Stripe;

class MarketplaceController extends Controller
{
    public function index(): JsonResponse
    {
        $products = Cache::remember('marketplace_products', 600, function () {
            return Product::where('active', true)->get();
        });

        return response()->json(['data' => $products]);
    }

    public function show(Product $product): JsonResponse
    {
        abort_if(! $product->active, 404);

        return response()->json(['data' => $product]);
    }

    public function checkout(Request $request, Product $product): JsonResponse
    {
        abort_if(! $product->active, 404);

        Stripe::setApiKey(config('services.stripe.secret'));

        $order = Order::create([
            'user_id'          => $request->user()->id,
            'product_id'       => $product->id,
            'stripe_session_id' => 'pending_' . uniqid(),
            'status'           => 'pending',
            'total_cents'      => $product->price_cents,
        ]);

        $session = Session::create([
            'payment_method_types' => ['card'],
            'line_items'           => [[
                'price_data' => [
                    'currency'     => 'eur',
                    'product_data' => [
                        'name'        => $product->name,
                        'description' => $product->description,
                    ],
                    'unit_amount' => $product->price_cents,
                ],
                'quantity' => 1,
            ]],
            'mode'        => 'payment',
            'success_url' => config('services.stripe.success_url') . '?order=' . $order->id,
            'cancel_url'  => config('services.stripe.cancel_url'),
            'metadata'    => ['order_id' => $order->id],
        ]);

        $order->update(['stripe_session_id' => $session->id]);

        return response()->json(['checkout_url' => $session->url]);
    }
}
