<?php

namespace App\Http\Controllers;

use App\Http\Requests\Comment\StoreCommentRequest;
use App\Http\Resources\CommentResource;
use App\Models\Comment;
use App\Models\Post;
use App\Services\CommentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommentController extends Controller
{
    public function __construct(
        protected CommentService $commentService
    ) {
    }

    public function index(Request $request, Post $post): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 15);

        $comments = $post->comments()
            ->with(['user'])
            ->withCount('likes')
            ->latest('created_at')
            ->paginate($perPage);

        // Optionally eager load current user's like for has_liked optimization
        if ($userId = $request->user()?->id) {
            $comments->loadMissing(['likes' => fn ($q) => $q->where('user_id', $userId)]);
        }

        return CommentResource::collection($comments)->response();
    }

    public function store(StoreCommentRequest $request, Post $post): JsonResponse
    {
        $comment = $this->commentService->store(
            $request->user(),
            $post,
            $request->validated()
        );

        $comment->load(['user'])->loadCount('likes');

        if ($userId = $request->user()?->id) {
            $comment->load(['likes' => fn ($q) => $q->where('user_id', $userId)]);
        }

        return (new CommentResource($comment))->response()->setStatusCode(201);
    }

    public function destroy(Request $request, Post $post, Comment $comment): JsonResponse
    {
        $comment->loadMissing('post');
        
        $this->authorize('delete', $comment);

        $this->commentService->delete($comment);

        return response()->json([
            'message' => 'Comment deleted',
        ]);
    }
}

