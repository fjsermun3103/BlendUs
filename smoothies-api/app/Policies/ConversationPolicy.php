<?php

namespace App\Policies;

use App\Models\Conversation;
use App\Models\User;

class ConversationPolicy
{
    public function view(User $user, Conversation $conversation): bool
    {
        return $conversation->participants()->where('user_id', $user->id)->exists();
    }

    public function update(User $user, Conversation $conversation): bool
    {
        return $conversation->type === 'group' && $conversation->owner_id === $user->id;
    }

    public function manage(User $user, Conversation $conversation): bool
    {
        return $conversation->type === 'group' && $conversation->owner_id === $user->id;
    }
}
