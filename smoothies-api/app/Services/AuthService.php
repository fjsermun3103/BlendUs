<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Support\Facades\Hash;

class AuthService
{
    public function register(array $data): array
    {
        $user = User::create([
            'name' => $data['name'],
            'username' => $data['username'],
            'email' => $data['email'],
            'password' => $data['password'],
        ]);

        $token = $user->createToken('api')->plainTextToken;

        return [$user, $token];
    }

    /**
     * @throws AuthenticationException
     */
    public function login(array $data): array
    {
        $user = User::where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            abort(401, 'Invalid credentials.');
        }

        $token = $user->createToken('api')->plainTextToken;

        return [$user, $token];
    }

    public function logout(User $user): void
    {
        $user->tokens()->delete();
    }
}

