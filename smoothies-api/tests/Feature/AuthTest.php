<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_and_receives_a_token(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Ana',
            'username' => 'ana',
            'email' => 'ana@example.com',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ]);

        $response->assertCreated()
            ->assertJsonStructure(['user' => ['id', 'name', 'username'], 'token'])
            ->assertJsonPath('user.username', 'ana');

        $this->assertDatabaseHas('users', ['email' => 'ana@example.com']);
        $this->assertNotSame('secret123', User::firstWhere('email', 'ana@example.com')->password);
    }

    public function test_register_validates_input(): void
    {
        User::factory()->create(['email' => 'taken@example.com', 'username' => 'taken']);

        $this->postJson('/api/auth/register', [
            'name' => 'X',
            'username' => 'taken',
            'email' => 'taken@example.com',
            'password' => 'short',
            'password_confirmation' => 'different',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['username', 'email', 'password']);
    }

    public function test_user_can_login_with_valid_credentials(): void
    {
        User::factory()->create(['email' => 'nico@test.com', 'password' => 'password123']);

        $this->postJson('/api/auth/login', [
            'email' => 'nico@test.com',
            'password' => 'password123',
        ])->assertOk()->assertJsonStructure(['user', 'token']);
    }

    public function test_user_can_login_with_username(): void
    {
        User::factory()->create(['username' => 'nico', 'email' => 'nico@test.com', 'password' => 'password123']);

        $this->postJson('/api/auth/login', [
            'email' => 'nico',
            'password' => 'password123',
        ])->assertOk()->assertJsonPath('user.username', 'nico');
    }

    public function test_login_fails_with_wrong_password(): void
    {
        User::factory()->create(['email' => 'nico@test.com', 'password' => 'password123']);

        $this->postJson('/api/auth/login', [
            'email' => 'nico@test.com',
            'password' => 'wrong',
        ])->assertUnauthorized();
    }

    public function test_logout_revokes_the_token(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('api')->plainTextToken;

        $this->withToken($token)->postJson('/api/auth/logout')->assertOk();

        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_protected_routes_require_authentication(): void
    {
        $this->postJson('/api/posts', [])->assertUnauthorized();
        $this->postJson('/api/likes', [])->assertUnauthorized();
        $this->getJson('/api/conversations')->assertUnauthorized();
        $this->postJson('/api/ai/generate-smoothie', [])->assertUnauthorized();
    }
}
