<?php

namespace Tests\Feature;

use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PostTest extends TestCase
{
    use RefreshDatabase;

    public function test_feed_is_public_and_paginated(): void
    {
        $this->createPost();
        $this->createPost();

        $this->getJson('/api/posts?per_page=1')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('meta.total', 2)
            ->assertJsonStructure(['data' => [['id', 'title', 'author', 'ingredients', 'tags', 'likes_count', 'comments_count', 'has_liked', 'has_saved']]]);
    }

    public function test_feed_can_be_searched_case_insensitively(): void
    {
        $this->createPost(attributes: ['title' => 'Mango Tango']);
        $this->createPost(attributes: ['title' => 'Green Machine']);

        $this->getJson('/api/posts?search=mango')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Mango Tango');
    }

    public function test_feed_can_be_filtered_by_tag(): void
    {
        $this->createPost(attributes: ['title' => 'Berry'], tags: ['berry']);
        $this->createPost(attributes: ['title' => 'Kale'], tags: ['green']);

        $this->getJson('/api/posts?tag=BERRY')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Berry');

        $this->getJson('/api/tags/berry/posts')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_feed_can_exclude_own_posts(): void
    {
        $me = $this->signIn();
        $this->createPost($me);
        $this->createPost();

        $this->getJson('/api/posts?exclude_own=1')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_authenticated_user_can_create_a_post_with_ingredients_and_tags(): void
    {
        $user = $this->signIn();

        $response = $this->postJson('/api/posts', $this->validPostPayload());

        $response->assertCreated()
            ->assertJsonPath('data.title', 'Mango Sunrise')
            ->assertJsonPath('data.author.id', $user->id)
            ->assertJsonCount(2, 'data.ingredients')
            ->assertJsonCount(2, 'data.tags');

        $post = Post::first();
        $this->assertNotNull($post->embedding, 'An embedding should be generated for new posts');
        $this->assertDatabaseHas('tags', ['name' => 'breakfast']);
    }

    public function test_post_can_be_created_with_an_uploaded_image(): void
    {
        Storage::fake('public');
        $this->signIn();

        // 1x1 PNG (the container has no GD, so UploadedFile::fake()->image() is unavailable)
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==');
        $payload = $this->validPostPayload(['image' => UploadedFile::fake()->createWithContent('smoothie.png', $png)]);

        $response = $this->post('/api/posts', $payload, ['Accept' => 'application/json'])->assertCreated();

        $this->assertStringContainsString('/storage/posts/', $response->json('data.image_url'));
        $this->assertCount(1, Storage::disk('public')->files('posts'));
    }

    public function test_post_creation_still_works_when_ollama_is_down(): void
    {
        $this->signIn();
        $this->fakeHttp([
            'ollama.test/*' => \Illuminate\Support\Facades\Http::failedConnection(),
        ]);

        $this->postJson('/api/posts', $this->validPostPayload())->assertCreated();
        $this->assertNull(Post::first()->embedding);
    }

    public function test_post_creation_validates_required_fields(): void
    {
        $this->signIn();

        $this->postJson('/api/posts', ['ingredients' => []])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['title', 'description', 'preparation_steps', 'ingredients']);

        $this->postJson('/api/posts', $this->validPostPayload([
            'ingredients' => [['name' => 'Mango', 'quantity' => -1, 'unit' => 'g']],
        ]))->assertUnprocessable()->assertJsonValidationErrors(['ingredients.0.quantity']);
    }

    public function test_show_returns_post_with_like_and_save_flags(): void
    {
        $user = $this->signIn();
        $post = $this->createPost();
        $user->savedPosts()->attach($post);

        $this->getJson("/api/posts/{$post->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $post->id)
            ->assertJsonPath('data.has_saved', true)
            ->assertJsonPath('data.has_liked', false);
    }

    public function test_show_returns_404_for_missing_post(): void
    {
        $this->getJson('/api/posts/999999')->assertNotFound();
    }

    public function test_owner_can_update_post_and_replace_ingredients_and_tags(): void
    {
        $user = $this->signIn();
        $post = $this->createPost($user);

        $this->putJson("/api/posts/{$post->id}", [
            'title' => 'Updated',
            'ingredients' => [['name' => 'Kiwi', 'quantity' => 2, 'unit' => 'piece']],
            'tags' => ['detox'],
        ])->assertOk()
            ->assertJsonPath('data.title', 'Updated')
            ->assertJsonCount(1, 'data.ingredients')
            ->assertJsonPath('data.ingredients.0.name', 'Kiwi')
            ->assertJsonPath('data.tags.0.name', 'detox');
    }

    public function test_owner_can_change_the_image_when_editing(): void
    {
        Storage::fake('public');
        $user = $this->signIn();
        $post = $this->createPost($user, ['image_url' => 'http://localhost:8000/storage/posts/old.png']);
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==');

        // Same request the frontend sends: multipart POST + X-HTTP-Method-Override: PUT
        $this->post("/api/posts/{$post->id}", [
            'title' => $post->title,
            'image' => UploadedFile::fake()->createWithContent('new.png', $png),
        ], ['Accept' => 'application/json', 'X-HTTP-Method-Override' => 'PUT'])->assertOk();

        $this->assertNotSame('http://localhost:8000/storage/posts/old.png', $post->fresh()->image_url, 'The new photo was ignored on update');
    }

    public function test_user_cannot_update_or_delete_someone_elses_post(): void
    {
        $this->signIn();
        $post = $this->createPost();

        $this->putJson("/api/posts/{$post->id}", ['title' => 'Hacked'])->assertForbidden();
        $this->deleteJson("/api/posts/{$post->id}")->assertForbidden();
        $this->assertDatabaseHas('posts', ['id' => $post->id, 'title' => $post->title]);
    }

    public function test_owner_can_delete_post(): void
    {
        $user = $this->signIn();
        $post = $this->createPost($user);

        $this->deleteJson("/api/posts/{$post->id}")->assertOk();
        $this->assertModelMissing($post);
        $this->assertDatabaseMissing('ingredients', ['post_id' => $post->id]);
    }

    public function test_user_can_toggle_saving_a_post(): void
    {
        $user = $this->signIn();
        $post = $this->createPost();

        $this->postJson("/api/posts/{$post->id}/save")->assertOk()->assertJson(['saved' => true]);
        $this->getJson("/api/users/{$user->id}/saved-posts")->assertOk()->assertJsonCount(1, 'data');

        $this->postJson("/api/posts/{$post->id}/save")->assertOk()->assertJson(['saved' => false]);
        $this->getJson("/api/users/{$user->id}/saved-posts")->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_personalized_feed_ranks_by_similarity_to_liked_posts(): void
    {
        $user = $this->signIn();
        $liked = $this->createPost();
        $liked->forceFill(['embedding' => json_encode(array_fill(0, 768, 1.0))])->save();
        $similar = $this->createPost(attributes: ['title' => 'Similar']);
        $similar->forceFill(['embedding' => json_encode(array_fill(0, 768, 0.9))])->save();
        $different = $this->createPost(attributes: ['title' => 'Different']);
        $different->forceFill(['embedding' => json_encode(array_merge(array_fill(0, 384, 1.0), array_fill(0, 384, -1.0)))])->save();

        $this->postJson('/api/likes', ['likeable_type' => Post::class, 'likeable_id' => $liked->id])->assertOk();

        $titles = collect($this->getJson('/api/posts/personalized')->assertOk()->json('data'))->pluck('title');
        $this->assertLessThan($titles->search('Different'), $titles->search('Similar'));
    }
}
