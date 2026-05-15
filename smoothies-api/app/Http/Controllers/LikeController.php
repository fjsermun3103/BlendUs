<?php

namespace App\Http\Controllers;

use App\Services\LikeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class LikeController extends Controller
{
    public function __construct(
        protected LikeService $likeService
    ) {
    }

    public function toggle(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'likeable_type' => [
                'required',
                'string',
                Rule::in([
                    'App\Models\Post',
                    'App\Models\Comment',
                ]),
            ],
            'likeable_id' => ['required', 'integer'],
        ]);

        $result = $this->likeService->toggle(
            $request->user(),
            $validated['likeable_type'],
            (int) $validated['likeable_id']
        );

        return response()->json($result);
    }
}

