<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Arr;

class UserService
{
    public function updateProfile(User $user, array $data): User
    {
        // Only the fields that were sent are changed; bio/avatar may be sent as null to clear them.
        $user->fill(array_filter(
            Arr::only($data, ['name', 'username', 'bio', 'avatar']),
            fn ($value, $key) => $value !== null || in_array($key, ['bio', 'avatar'], true),
            ARRAY_FILTER_USE_BOTH,
        ))->save();

        return $user->fresh();
    }

    public function follow(User $follower, User $userToFollow): void
    {
        if ($follower->is($userToFollow)) {
            return;
        }

        $follower->following()->syncWithoutDetaching([$userToFollow->id]);
    }

    public function unfollow(User $follower, User $userToUnfollow): void
    {
        $follower->following()->detach($userToUnfollow->id);
    }

    public function getFollowers(User $user)
    {
        return $user->followers;
    }

    public function getFollowing(User $user)
    {
        return $user->following;
    }
}

