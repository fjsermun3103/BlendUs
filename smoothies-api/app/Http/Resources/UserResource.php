<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'name'            => $this->name,
            'username'        => $this->username,
            'email'           => $this->when(auth('sanctum')->check() && auth('sanctum')->id() === $this->id, $this->email),
            'bio'             => $this->bio,
            'avatar'          => $this->avatar,
            'posts_count'     => $this->posts_count ?? $this->whenLoaded('posts', fn () => $this->posts->count()),
            'followers_count' => $this->followers_count ?? $this->whenLoaded('followers', fn () => $this->followers->count()),
            'following_count' => $this->following_count ?? $this->whenLoaded('following', fn () => $this->following->count()),
            'is_following'    => $this->when(
                auth('sanctum')->check(),
                fn () => auth('sanctum')->user()->following()->where('following_id', $this->id)->exists()
            ),
            'created_at'      => $this->created_at,
        ];
    }
}

