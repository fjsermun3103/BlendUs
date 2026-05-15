<?php

namespace App\Services;

use App\Models\Comment;
use App\Models\Post;
use App\Models\User;

class CommentService
{
    public function store(User $user, Post $post, array $data): Comment
    {
        return $post->comments()->create([
            'body' => $data['body'],
            'user_id' => $user->id,
        ]);
    }

    public function delete(Comment $comment): void
    {
        // Ensure likes tied to this comment are removed.
        $comment->likes()->delete();

        $comment->delete();
    }
}

