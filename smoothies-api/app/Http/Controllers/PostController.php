<?php

namespace App\Http\Controllers;

use App\Http\Requests\Post\StorePostRequest;
use App\Http\Requests\Post\UpdatePostRequest;
use App\Http\Resources\PostCollection;
use App\Http\Resources\PostResource;
use App\Models\Post;
use App\Services\EmbeddingService;
use App\Services\PostService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PostController extends Controller
{
    public function __construct(
        protected PostService $postService,
        protected EmbeddingService $embeddingService
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 15);
        $page    = (int) $request->query('page', 1);
        $userId  = $request->query('user_id');
        $search  = $request->query('search');
        $tag     = $request->query('tag');
        $excludeOwn = $request->boolean('exclude_own', false);

        if ($userId) {
            $posts = Post::query()
                ->where('user_id', (int) $userId)
                ->with(['user', 'ingredients', 'tags'])
                ->withCount(['likes', 'comments'])
                ->latest('created_at')
                ->paginate($perPage, ['*'], 'page', $page);
        } else {
            $posts = $this->postService->getFeed($perPage, $excludeOwn, $search, $tag);
        }

        return (new PostCollection($posts))->response();
    }



    public function personalized(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 15);

        $posts = $this->postService->getPersonalizedFeed($request->user(), $perPage);

        return (new PostCollection($posts))->response();
    }

    public function store(StorePostRequest $request): JsonResponse
    {
        $data = $request->validated();

        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('posts', 'public');
            $data['image_url'] = url('/storage/' . $path);
        }

        $post = $this->postService->store($request->user(), $data);

        return (new PostResource($post))->response()->setStatusCode(201);
    }

    public function show(Post $post): JsonResponse
    {
        $post->load(['user', 'ingredients', 'tags'])
            ->loadCount(['likes', 'comments']);

        if ($userId = auth()->id()) {
            $post->load([
                'likes' => fn ($q) => $q->where('user_id', $userId),
                'savedBy' => fn ($q) => $q->where('users.id', $userId)
            ]);
        }

        return (new PostResource($post))->response();
    }

    public function update(UpdatePostRequest $request, Post $post): JsonResponse
    {
        $this->authorize('update', $post);

        $updated = $this->postService->update($post, $request->validated());

        return (new PostResource($updated))->response();
    }

    public function destroy(Request $request, Post $post): JsonResponse
    {
        $this->authorize('delete', $post);

        $this->postService->delete($post);

        return response()->json([
            'message' => 'Post deleted',
        ]);
    }

    public function byTag(Request $request, string $tag): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 15);

        $posts = $this->postService->getByTag($tag, $perPage);

        return (new PostCollection($posts))->response();
    }

    public function toggleSave(Request $request, Post $post): JsonResponse
    {
        $user = $request->user();
        $isSaved = $user->savedPosts()->where('post_id', $post->id)->exists();

        if ($isSaved) {
            $user->savedPosts()->detach($post->id);
            $saved = false;
        } else {
            $user->savedPosts()->attach($post->id);
            $saved = true;

            // Update user preference vector
            $this->embeddingService->updateUserPreference($user);
        }

        return response()->json(['saved' => $saved]);
    }
}

