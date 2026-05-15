<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CommentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $user = $request->user();

        $hasLiked = false;

        if ($user) {
            if ($this->relationLoaded('likes')) {
                $hasLiked = $this->likes->contains('user_id', $user->id);
            } else {
                $hasLiked = $this->likes()
                    ->where('user_id', $user->id)
                    ->exists();
            }
        }

        return [
            'id' => $this->id,
            'body' => $this->body,
            'created_at' => $this->created_at,
            'author' => new UserResource($this->whenLoaded('user')),
            'likes_count' => $this->when(
                $this->offsetExists('likes_count'),
                $this->likes_count,
                fn () => $this->whenLoaded('likes', fn () => $this->likes->count())
            ),
            'has_liked' => $hasLiked,
        ];
    }
}

