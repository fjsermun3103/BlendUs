<?php

namespace Tests;

use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;

abstract class TestCase extends BaseTestCase
{
    /**
     * Safety net: RefreshDatabase wipes whatever database it is pointed at.
     * Refuse to run unless the configured database is a dedicated *_test one.
     */
    public function createApplication()
    {
        $app = parent::createApplication();

        $connection = $app['config']->get('database.default');
        $database = (string) $app['config']->get("database.connections.{$connection}.database");

        if (! str_ends_with($database, '_test')) {
            fwrite(STDERR, "\nRefusing to run tests against database '{$database}'. Expected a *_test database.\n");
            exit(1);
        }

        return $app;
    }

    protected function setUp(): void
    {
        parent::setUp();

        // Never hit the real Ollama/Stripe from the test suite.
        Http::preventStrayRequests();
        $this->fakeOllamaEmbeddings();
    }

    /** Ollama embeddings endpoint returning a valid 768-dim vector (matches the vector(768) columns). */
    protected function fakeOllamaEmbeddings(float $value = 0.01): void
    {
        Http::fake([
            'ollama.test/api/embeddings' => Http::response([
                'embedding' => array_fill(0, 768, $value),
            ]),
        ]);
    }

    /** Replace every HTTP stub registered so far (the first matching stub wins in Laravel). */
    protected function fakeHttp(array $stubs): void
    {
        Http::swap(new \Illuminate\Http\Client\Factory());
        Http::preventStrayRequests();
        Http::fake($stubs);
    }

    protected function signIn(?User $user = null): User
    {
        $user ??= User::factory()->create();
        Sanctum::actingAs($user);

        return $user;
    }

    /** A post with ingredients and tags, like the ones the app creates. */
    protected function createPost(?User $author = null, array $attributes = [], array $tags = ['green']): Post
    {
        $post = Post::factory()
            ->for($author ?? User::factory())
            ->create($attributes);

        $post->ingredients()->createMany([
            ['name' => 'Banana', 'quantity' => 1, 'unit' => 'piece'],
            ['name' => 'Spinach', 'quantity' => 50, 'unit' => 'g'],
        ]);

        foreach ($tags as $tag) {
            $post->tags()->attach(\App\Models\Tag::firstOrCreate(['name' => $tag]));
        }

        return $post;
    }

    protected function validPostPayload(array $overrides = []): array
    {
        return array_merge([
            'title' => 'Mango Sunrise',
            'description' => 'A bright tropical smoothie.',
            'preparation_steps' => 'Blend everything until smooth.',
            'ingredients' => [
                ['name' => 'Mango', 'quantity' => 150, 'unit' => 'g'],
                ['name' => 'Orange juice', 'quantity' => 200, 'unit' => 'ml'],
            ],
            'tags' => ['tropical', 'breakfast'],
        ], $overrides);
    }
}
