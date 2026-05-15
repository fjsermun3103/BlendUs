<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PostResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $user = auth('sanctum')->user();

        $hasLiked = false;
        $hasSaved = false;

        if ($user) {
            if ($this->relationLoaded('likes')) {
                $hasLiked = $this->likes->contains('user_id', $user->id);
            } else {
                $hasLiked = $this->likes()
                    ->where('user_id', $user->id)
                    ->exists();
            }

            if ($this->relationLoaded('savedBy')) {
                $hasSaved = $this->savedBy->contains('id', $user->id);
            } else {
                $hasSaved = $this->savedBy()
                    ->where('user_id', $user->id)
                    ->exists();
            }
        }

        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'preparation_steps' => $this->preparation_steps,
            'image_url' => $this->image_url,
            'created_at' => $this->created_at,
            'author' => new UserResource($this->whenLoaded('user')),
            'ingredients' => $this->whenLoaded('ingredients', function () {
                return $this->ingredients->map(fn ($ingredient) => [
                    'name' => $ingredient->name,
                    'quantity' => $ingredient->quantity,
                    'unit' => $ingredient->unit,
                ]);
            }),
            'tags' => TagResource::collection($this->whenLoaded('tags')),
            'likes_count' => $this->when(
                $this->offsetExists('likes_count'),
                $this->likes_count,
                fn () => $this->whenLoaded('likes', fn () => $this->likes->count())
            ),
            'comments_count' => $this->when(
                $this->offsetExists('comments_count'),
                $this->comments_count,
                fn () => $this->whenLoaded('comments', fn () => $this->comments->count())
            ),
            'has_liked' => $hasLiked,
            'has_saved' => $hasSaved,
        ];
    }
}

