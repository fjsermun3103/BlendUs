<?php

namespace App\Services;

use App\Models\Post;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

class PostService
{
    public function __construct(
        protected EmbeddingService $embeddingService
    ) {}

    public function store(User $user, array $data): Post
    {
        return DB::transaction(function () use ($user, $data) {
            $post = $user->posts()->create([
                'title' => $data['title'],
                'description' => $data['description'],
                'preparation_steps' => $data['preparation_steps'],
                'image_url' => $data['image_url'] ?? null,
            ]);

            $post->ingredients()->createMany($data['ingredients']);

            if (! empty($data['tags'])) {
                $tagIds = collect($data['tags'])
                    ->filter()
                    ->map(function (string $name) {
                        $trimmed = trim($name);
                        return $trimmed === '' ? null : $trimmed;
                    })
                    ->filter()
                    ->map(function (string $name) {
                        return Tag::firstOrCreate(['name' => $name])->id;
                    })
                    ->values()
                    ->all();

                $post->tags()->sync($tagIds);
            }

            // Generate initial embedding
            $this->embeddingService->updatePostEmbedding($post);

            return $post->load(['user', 'ingredients', 'tags'])
                ->loadCount(['likes', 'comments']);
        });
    }

    public function update(Post $post, array $data): Post
    {
        return DB::transaction(function () use ($post, $data) {
            $post->fill(Arr::only($data, [
                'title',
                'description',
                'preparation_steps',
                'image_url',
            ]));

            $post->save();

            if (array_key_exists('ingredients', $data)) {
                $post->ingredients()->delete();

                if (! empty($data['ingredients'])) {
                    $post->ingredients()->createMany($data['ingredients']);
                }
            }

            if (array_key_exists('tags', $data)) {
                $tagIds = collect($data['tags'] ?? [])
                    ->filter()
                    ->map(function (string $name) {
                        $trimmed = trim($name);
                        return $trimmed === '' ? null : $trimmed;
                    })
                    ->filter()
                    ->map(function (string $name) {
                        return Tag::firstOrCreate(['name' => $name])->id;
                    })
                    ->values()
                    ->all();

                $post->tags()->sync($tagIds);
            }

            // Update embedding
            $this->embeddingService->updatePostEmbedding($post);

            return $post->load(['user', 'ingredients', 'tags'])
                ->loadCount(['likes', 'comments']);
        });
    }

    public function delete(Post $post): void
    {
        $post->delete();
    }

    public function getFeed(int $perPage = 15, bool $excludeOwn = true, ?string $search = null, ?string $tag = null): LengthAwarePaginator
    {
        $userId = auth('sanctum')->id();
        
        $query = Post::query()
            ->with(['user', 'ingredients', 'tags'])
            ->withCount(['likes', 'comments'])
            ->when($userId && $excludeOwn, fn($q) => $q->where('user_id', '!=', $userId))
            ->when($tag, function ($q) use ($tag) {
                $q->whereHas('tags', function ($sq) use ($tag) {
                    $sq->whereRaw('LOWER(name) = ?', [strtolower($tag)]);
                });
            })
            ->when($search, function ($q) use ($search) {
                $q->where(function ($sq) use ($search) {
                    $sq->where('title', 'ilike', '%' . $search . '%')
                       ->orWhere('description', 'ilike', '%' . $search . '%');
                });
            })
            ->latest('created_at');

        if ($userId) {
            $query->with([
                'likes' => fn($q) => $q->where('user_id', $userId),
                'savedBy' => fn($q) => $q->where('users.id', $userId)
            ]);
        }

        return $query->paginate($perPage);
    }



    public function getByTag(string $tagName, int $perPage = 15): LengthAwarePaginator
    {
        $userId = auth('sanctum')->id();

        $query = Post::query()
            ->whereHas('tags', function ($query) use ($tagName) {
                $query->whereRaw('LOWER(name) = ?', [strtolower($tagName)]);
            })
            ->with(['user', 'ingredients', 'tags'])
            ->withCount(['likes', 'comments'])
            ->latest('created_at');

        if ($userId) {
            $query->with([
                'likes' => fn ($q) => $q->where('user_id', $userId),
                'savedBy' => fn ($q) => $q->where('users.id', $userId)
            ]);
        }

        return $query->paginate($perPage);
    }

    public function getPersonalizedFeed(User $user, int $perPage = 15): LengthAwarePaginator
    {
        // 1. Ensure user has a preference vector
        if (! $user->preference_embedding) {
            $this->embeddingService->updateUserPreference($user);
        }

        $query = Post::query()
            ->with(['user', 'ingredients', 'tags'])
            ->withCount(['likes', 'comments'])
            ->where('user_id', '!=', $user->id);

        if ($user->preference_embedding) {
            // Rank by similarity using pgvector distance operator <=> (cosine distance)
            $query->addSelect('*')
                ->selectRaw('embedding <=> ? AS distance', [$user->preference_embedding])
                ->orderBy('distance', 'asc');
        } else {
            // Fallback to latest if no preferences yet
            $query->latest('created_at');
        }

        $query->with([
            'likes' => fn ($q) => $q->where('user_id', $user->id),
            'savedBy' => fn ($q) => $q->where('users.id', $user->id)
        ]);

        return $query->paginate($perPage);
    }
}

