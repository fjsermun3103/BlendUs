<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\UserService;
use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function __construct(
        protected UserService $userService
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $users = User::query()
            ->where('id', '!=', $request->user()?->id)
            ->get();

        return UserResource::collection($users)->response();
    }

    public function show(User $user): JsonResponse
    {
        $user->loadCount(['posts', 'followers', 'following']);
        return (new UserResource($user))->response();
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $this->authorize('update', $user);

        $data = $request->validate([
            'name'     => ['sometimes', 'string', 'max:100'],
            'username' => ['sometimes', 'string', 'max:50', Rule::unique('users')->ignore($user->id)],
            'bio'      => ['sometimes', 'nullable', 'string'],
            'avatar'   => ['sometimes', 'nullable', 'string'],
        ]);

        if ($request->hasFile('avatar_file')) {
            $path = $request->file('avatar_file')->store('avatars', 'public');
            $data['avatar'] = url('/storage/' . $path);
        }

        $updated = $this->userService->updateProfile($user, $data);

        return (new UserResource($updated))->response();
    }

    public function follow(Request $request, User $user): JsonResponse
    {
        $this->userService->follow($request->user(), $user);

        return response()->json([
            'message' => 'Followed',
        ]);
    }

    public function unfollow(Request $request, User $user): JsonResponse
    {
        $this->userService->unfollow($request->user(), $user);

        return response()->json([
            'message' => 'Unfollowed',
        ]);
    }

    public function followers(User $user): JsonResponse
    {
        $followers = $this->userService->getFollowers($user);

        return UserResource::collection($followers)->response();
    }

    public function following(User $user): JsonResponse
    {
        $following = $this->userService->getFollowing($user);

        return UserResource::collection($following)->response();
    }

    public function suggested(Request $request): JsonResponse
    {
        $userId = $request->user()?->id;

        $users = User::query()
            ->withCount(['posts'])
            ->when($userId, fn($q) => $q->where('id', '!=', $userId))
            ->inRandomOrder()
            ->limit(3)
            ->get();

        return UserResource::collection($users)->response();
    }

    public function saved_posts(Request $request, User $user): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 15);
        $posts = $user->savedPosts()
            ->with(['user', 'ingredients', 'tags'])
            ->withCount(['likes', 'comments']);

        if ($userId = auth()->id()) {
            $posts->with([
                'likes' => fn($q) => $q->where('user_id', $userId),
                'savedBy' => fn($q) => $q->where('user_id', $userId)
            ]);
        }

        $paginated = $posts->latest('saved_posts.created_at')->paginate($perPage);
        return (new \App\Http\Resources\PostCollection($paginated))->response();
    }

    public function liked_posts(Request $request, User $user): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 15);
        $posts = $user->likedPosts()
            ->with(['user', 'ingredients', 'tags'])
            ->withCount(['likes', 'comments']);

        if ($userId = auth()->id()) {
            $posts->with([
                'likes' => fn($q) => $q->where('user_id', $userId),
                'savedBy' => fn($q) => $q->where('user_id', $userId)
            ]);
        }

        $paginated = $posts->latest('likes.created_at')->paginate($perPage);
        return (new \App\Http\Resources\PostCollection($paginated))->response();
    }
}

