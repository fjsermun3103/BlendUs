<?php

namespace Tests\Feature;

use App\Models\Comment;
use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/** Comments, likes, follows and profiles. */
class InteractionTest extends TestCase
{
    use RefreshDatabase;

    // ── Comments ───────────────────────────────────────────────

    public function test_user_can_comment_and_comments_are_listed(): void
    {
        $user = $this->signIn();
        $post = $this->createPost();

        $this->postJson("/api/posts/{$post->id}/comments", ['body' => 'Delicious!'])
            ->assertCreated()
            ->assertJsonPath('data.body', 'Delicious!')
            ->assertJsonPath('data.author.id', $user->id);

        $this->getJson("/api/posts/{$post->id}/comments")
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->getJson("/api/posts/{$post->id}")->assertJsonPath('data.comments_count', 1);
    }

    public function test_comment_body_is_required_and_limited(): void
    {
        $this->signIn();
        $post = $this->createPost();

        $this->postJson("/api/posts/{$post->id}/comments", ['body' => ''])->assertUnprocessable();
        $this->postJson("/api/posts/{$post->id}/comments", ['body' => str_repeat('a', 1001)])->assertUnprocessable();
    }

    public function test_comment_can_be_deleted_by_author_or_post_owner_but_not_strangers(): void
    {
        $postOwner = User::factory()->create();
        $author = User::factory()->create();
        $post = $this->createPost($postOwner);
        $c1 = Comment::create(['post_id' => $post->id, 'user_id' => $author->id, 'body' => 'one']);
        $c2 = Comment::create(['post_id' => $post->id, 'user_id' => $author->id, 'body' => 'two']);

        $this->signIn();
        $this->deleteJson("/api/posts/{$post->id}/comments/{$c1->id}")->assertForbidden();

        $this->signIn($author);
        $this->deleteJson("/api/posts/{$post->id}/comments/{$c1->id}")->assertOk();

        $this->signIn($postOwner);
        $this->deleteJson("/api/posts/{$post->id}/comments/{$c2->id}")->assertOk();

        $this->assertSame(0, Comment::count());
    }

    public function test_comment_cannot_be_deleted_through_another_posts_url(): void
    {
        $me = User::factory()->create();
        $myPost = $this->createPost($me);
        $otherPost = $this->createPost();
        $comment = Comment::create(['post_id' => $otherPost->id, 'user_id' => User::factory()->create()->id, 'body' => 'x']);

        $this->signIn($me);
        $status = $this->deleteJson("/api/posts/{$myPost->id}/comments/{$comment->id}")->status();
        $this->assertContains($status, [403, 404]);
        $this->assertModelExists($comment);
    }

    // ── Likes ──────────────────────────────────────────────────

    public function test_like_toggles_on_and_off_with_count(): void
    {
        $this->signIn();
        $post = $this->createPost();
        $payload = ['likeable_type' => Post::class, 'likeable_id' => $post->id];

        $this->postJson('/api/likes', $payload)->assertOk()->assertExactJson(['liked' => true, 'count' => 1]);
        $this->getJson("/api/posts/{$post->id}")->assertJsonPath('data.has_liked', true);
        $this->postJson('/api/likes', $payload)->assertOk()->assertExactJson(['liked' => false, 'count' => 0]);
    }

    public function test_user_can_like_a_comment(): void
    {
        $this->signIn();
        $post = $this->createPost();
        $comment = Comment::create(['post_id' => $post->id, 'user_id' => $post->user_id, 'body' => 'x']);

        $this->postJson('/api/likes', ['likeable_type' => Comment::class, 'likeable_id' => $comment->id])
            ->assertOk()->assertJson(['liked' => true]);
    }

    public function test_like_rejects_invalid_type_and_missing_target(): void
    {
        $this->signIn();

        $this->postJson('/api/likes', ['likeable_type' => User::class, 'likeable_id' => 1])->assertUnprocessable();
        $this->postJson('/api/likes', ['likeable_type' => Post::class, 'likeable_id' => 999999])->assertNotFound();
    }

    public function test_liked_posts_endpoint_lists_liked_posts(): void
    {
        $user = $this->signIn();
        $post = $this->createPost();
        $this->postJson('/api/likes', ['likeable_type' => Post::class, 'likeable_id' => $post->id]);

        $this->getJson("/api/users/{$user->id}/liked-posts")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $post->id);
    }

    // ── Follows ────────────────────────────────────────────────

    public function test_user_can_follow_and_unfollow(): void
    {
        $me = $this->signIn();
        $other = User::factory()->create();

        $this->postJson("/api/users/{$other->id}/follow")->assertOk();
        $this->postJson("/api/users/{$other->id}/follow")->assertOk(); // idempotent
        $this->getJson("/api/users/{$other->id}")
            ->assertJsonPath('data.followers_count', 1)
            ->assertJsonPath('data.is_following', true);
        $this->getJson("/api/users/{$me->id}/following")->assertJsonCount(1, 'data');

        $this->deleteJson("/api/users/{$other->id}/follow")->assertOk();
        $this->getJson("/api/users/{$other->id}")->assertJsonPath('data.followers_count', 0);
    }

    public function test_user_cannot_follow_themselves(): void
    {
        $me = $this->signIn();

        $this->postJson("/api/users/{$me->id}/follow");
        $this->getJson("/api/users/{$me->id}")->assertJsonPath('data.followers_count', 0);
    }

    // ── Profiles ───────────────────────────────────────────────

    public function test_profile_is_public_and_hides_email_from_others(): void
    {
        $user = User::factory()->create();
        $this->createPost($user);

        $this->getJson("/api/users/{$user->id}")
            ->assertOk()
            ->assertJsonPath('data.posts_count', 1)
            ->assertJsonMissingPath('data.email');
    }

    public function test_user_can_update_own_profile_but_not_others(): void
    {
        $me = $this->signIn();
        $other = User::factory()->create();

        $this->putJson("/api/users/{$me->id}", ['name' => 'New Name', 'bio' => 'Hi'])
            ->assertOk()
            ->assertJsonPath('data.name', 'New Name');

        $this->putJson("/api/users/{$other->id}", ['name' => 'Hacked'])->assertForbidden();
    }

    public function test_username_must_stay_unique_on_update(): void
    {
        $me = $this->signIn();
        User::factory()->create(['username' => 'taken']);

        $this->putJson("/api/users/{$me->id}", ['username' => 'taken'])
            ->assertUnprocessable()->assertJsonValidationErrors('username');
    }

    public function test_user_can_clear_their_bio(): void
    {
        $me = $this->signIn(User::factory()->create(['bio' => 'Old bio']));

        $this->putJson("/api/users/{$me->id}", ['bio' => null])->assertOk();

        $this->assertNull($me->fresh()->bio);
    }

    public function test_avatar_upload_only_accepts_images(): void
    {
        Storage::fake('public');
        $me = $this->signIn();

        $html = UploadedFile::fake()->createWithContent('avatar.html', '<script>alert(document.cookie)</script>');

        $this->post("/api/users/{$me->id}", [
            '_method' => 'PUT',
            'avatar_file' => $html,
        ], ['Accept' => 'application/json'])->assertUnprocessable();

        $this->assertEmpty(Storage::disk('public')->allFiles(), 'Non-image files must not be stored in public storage');
    }

    public function test_suggested_users_excludes_current_user(): void
    {
        $me = $this->signIn();
        User::factory()->count(5)->create();

        $ids = collect($this->getJson('/api/users/suggested')->assertOk()->json('data'))->pluck('id');

        $this->assertCount(3, $ids);
        $this->assertNotContains($me->id, $ids);
    }

    public function test_guests_can_see_suggested_users(): void
    {
        User::factory()->count(4)->create();

        $this->getJson('/api/users/suggested')->assertOk()->assertJsonCount(3, 'data');
    }

    public function test_tags_are_listed_with_post_counts(): void
    {
        $this->createPost(tags: ['berry']);
        $this->createPost(tags: ['berry', 'green']);

        $this->getJson('/api/tags')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'berry');
    }
}
