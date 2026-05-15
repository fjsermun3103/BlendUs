<?php

namespace App\Services;

use App\Models\User;

class UserService
{
    public function updateProfile(User $user, array $data): User
    {
        $user->fill([
            'name' => $data['name'] ?? $user->name,
            'username' => $data['username'] ?? $user->username,
            'bio' => $data['bio'] ?? $user->bio,
            'avatar' => $data['avatar'] ?? $user->avatar,
        ])->save();

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

