<?php

namespace App\Http\Controllers;

use App\Http\Resources\TagResource;
use App\Models\Tag;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class TagController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = $request->query('search');

        // Cache for 5 minutes when no search filter is active
        if (!$search) {
            $tags = Cache::remember('tags_all', 300, function () {
                return Tag::query()
                    ->withCount('posts')
                    ->orderByDesc('posts_count')
                    ->get();
            });
        } else {
            $tags = Tag::query()
                ->where('name', 'like', '%'.$search.'%')
                ->withCount('posts')
                ->orderByDesc('posts_count')
                ->get();
        }

        return TagResource::collection($tags)->response();
    }
}

