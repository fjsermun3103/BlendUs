<?php

namespace App\Services;

use App\Models\Post;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class EmbeddingService
{
    protected string $ollamaUrl;
    protected string $model;

    public function __construct()
    {
        $this->ollamaUrl = env('OLLAMA_URL', 'http://ollama:11434');
        $this->model = env('OLLAMA_EMBEDDING_MODEL', 'nomic-embed-text');
    }

    public function generateEmbedding(string $text): ?array
    {
        try {
            $response = Http::post("{$this->ollamaUrl}/api/embeddings", [
                'model' => $this->model,
                'prompt' => $text,
            ]);

            if ($response->successful()) {
                return $response->json('embedding');
            }

            Log::error('Ollama Embedding Error: ' . $response->body());
        } catch (\Exception $e) {
            Log::error('Ollama Embedding Exception: ' . $e->getMessage());
        }

        return null;
    }

    public function getPostText(Post $post): string
    {
        $ingredients = $post->ingredients->pluck('name')->implode(', ');
        $tags = $post->tags->pluck('name')->implode(', ');

        return "Title: {$post->title}. Description: {$post->description}. Ingredients: {$ingredients}. Tags: {$tags}";
    }

    public function updatePostEmbedding(Post $post): void
    {
        $text = $this->getPostText($post);
        $embedding = $this->generateEmbedding($text);

        if ($embedding) {
            $post->embedding = json_encode($embedding);
            $post->save();
        }
    }

    /**
     * Update user preference vector based on liked and saved posts.
     */
    public function updateUserPreference(User $user): void
    {
        $likedPosts = $user->likedPosts()->whereNotNull('embedding')->get();
        $savedPosts = $user->savedPosts()->whereNotNull('embedding')->get();

        $allPosts = $likedPosts->merge($savedPosts)->unique('id');

        if ($allPosts->isEmpty()) {
            return;
        }

        $sumVector = null;
        $count = 0;

        foreach ($allPosts as $post) {
            $vector = json_decode($post->embedding, true);
            if (! $vector) continue;

            if ($sumVector === null) {
                $sumVector = $vector;
            } else {
                foreach ($vector as $i => $value) {
                    $sumVector[$i] += $value;
                }
            }
            $count++;
        }

        if ($sumVector && $count > 0) {
            // Average the vectors
            foreach ($sumVector as $i => $value) {
                $sumVector[$i] /= $count;
            }

            $user->preference_embedding = json_encode($sumVector);
            $user->save();
        }
    }
}
