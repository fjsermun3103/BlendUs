<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Rejects AI requests when AI_ENABLED=false (free demo hosting without Ollama). */
class EnsureAiEnabled
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! config('services.ai.enabled')) {
            return response()->json([
                'error' => 'AI features are not available in this demo.',
                'ai_disabled' => true,
            ], 503);
        }

        return $next($request);
    }
}
