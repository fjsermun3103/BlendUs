<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ConversationTest extends TestCase
{
    use RefreshDatabase;

    private function dmBetween(User $a, User $b): Conversation
    {
        $conversation = Conversation::create(['type' => 'dm']);
        $conversation->participants()->attach([$a->id, $b->id]);

        return $conversation;
    }

    public function test_user_can_start_a_direct_message_and_it_is_reused(): void
    {
        $this->signIn();
        $friend = User::factory()->create();

        $id = $this->postJson('/api/conversations', ['type' => 'dm', 'user_id' => $friend->id])
            ->assertSuccessful()
            ->assertJsonPath('data.type', 'dm')
            ->assertJsonCount(2, 'data.participants')
            ->json('data.id');

        $this->postJson('/api/conversations', ['type' => 'dm', 'user_id' => $friend->id])
            ->assertJsonPath('data.id', $id);

        $this->assertSame(1, Conversation::count());
    }

    public function test_user_cannot_start_a_direct_message_with_themselves(): void
    {
        $me = $this->signIn();

        $this->postJson('/api/conversations', ['type' => 'dm', 'user_id' => $me->id])
            ->assertUnprocessable();
    }

    public function test_user_can_create_a_group_and_is_its_admin(): void
    {
        $me = $this->signIn();
        [$a, $b] = User::factory()->count(2)->create();

        $id = $this->postJson('/api/conversations', [
            'type' => 'group',
            'name' => 'Smoothie club',
            'user_ids' => [$a->id, $b->id],
        ])->assertSuccessful()
            ->assertJsonPath('data.name', 'Smoothie club')
            ->assertJsonPath('data.owner_id', $me->id)
            ->assertJsonCount(3, 'data.participants')
            ->json('data.id');

        $this->assertDatabaseHas('conversation_user', ['conversation_id' => $id, 'user_id' => $me->id, 'role' => 'admin']);
    }

    public function test_group_creator_stays_admin_even_if_included_in_user_ids(): void
    {
        $me = $this->signIn();
        $a = User::factory()->create();

        $id = $this->postJson('/api/conversations', [
            'type' => 'group',
            'name' => 'Club',
            'user_ids' => [$me->id, $a->id],
        ])->assertSuccessful()->json('data.id');

        $this->assertDatabaseHas('conversation_user', ['conversation_id' => $id, 'user_id' => $me->id, 'role' => 'admin']);
    }

    public function test_participants_can_send_and_read_messages(): void
    {
        $me = $this->signIn();
        $conversation = $this->dmBetween($me, User::factory()->create());

        $this->postJson("/api/conversations/{$conversation->id}/messages", ['body' => 'Hola!'])
            ->assertSuccessful()
            ->assertJsonPath('data.body', 'Hola!')
            ->assertJsonPath('data.sender.id', $me->id);

        $this->getJson("/api/conversations/{$conversation->id}/messages")
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->getJson('/api/conversations')
            ->assertOk()
            ->assertJsonPath('data.0.last_message.body', 'Hola!');
    }

    public function test_outsiders_cannot_read_or_write_a_conversation(): void
    {
        $conversation = $this->dmBetween(User::factory()->create(), User::factory()->create());
        $this->signIn();

        $this->getJson("/api/conversations/{$conversation->id}")->assertForbidden();
        $this->getJson("/api/conversations/{$conversation->id}/messages")->assertForbidden();
        $this->postJson("/api/conversations/{$conversation->id}/messages", ['body' => 'spam'])->assertForbidden();
    }

    public function test_user_can_only_delete_own_messages(): void
    {
        $me = User::factory()->create();
        $friend = User::factory()->create();
        $conversation = $this->dmBetween($me, $friend);
        $theirs = $conversation->messages()->create(['user_id' => $friend->id, 'body' => 'theirs']);
        $mine = $conversation->messages()->create(['user_id' => $me->id, 'body' => 'mine']);

        $this->signIn($me);
        $this->deleteJson("/api/conversations/{$conversation->id}/messages/{$theirs->id}")->assertForbidden();
        $this->deleteJson("/api/conversations/{$conversation->id}/messages/{$mine->id}")->assertNoContent();
    }

    public function test_cannot_delete_someone_elses_message_through_another_conversation(): void
    {
        $me = User::factory()->create();
        $friend = User::factory()->create();
        $convA = $this->dmBetween($me, User::factory()->create());
        $convB = $this->dmBetween($friend, User::factory()->create());
        $message = $convB->messages()->create(['user_id' => $friend->id, 'body' => 'private']);

        $this->signIn($me);
        $status = $this->deleteJson("/api/conversations/{$convA->id}/messages/{$message->id}")->status();
        $this->assertContains($status, [403, 404]);
        $this->assertModelExists($message);
    }

    public function test_only_group_owner_can_manage_members_and_rename(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $newcomer = User::factory()->create();
        $group = Conversation::create(['type' => 'group', 'name' => 'G', 'owner_id' => $owner->id]);
        $group->participants()->attach([$owner->id => ['role' => 'admin'], $member->id => ['role' => 'member']]);

        $this->signIn($member);
        $this->putJson("/api/conversations/{$group->id}", ['name' => 'Hacked'])->assertForbidden();
        $this->postJson("/api/conversations/{$group->id}/members", ['user_id' => $newcomer->id])->assertForbidden();

        $this->signIn($owner);
        $this->putJson("/api/conversations/{$group->id}", ['name' => 'Renamed'])->assertOk()->assertJsonPath('data.name', 'Renamed');
        $this->postJson("/api/conversations/{$group->id}/members", ['user_id' => $newcomer->id])
            ->assertOk()->assertJsonCount(3, 'data.participants');
        $this->deleteJson("/api/conversations/{$group->id}/members/{$member->id}")->assertNoContent();
    }

    public function test_leaving_vs_deleting_a_group(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $group = Conversation::create(['type' => 'group', 'name' => 'G', 'owner_id' => $owner->id]);
        $group->participants()->attach([$owner->id => ['role' => 'admin'], $member->id => ['role' => 'member']]);

        $this->signIn($member);
        $this->deleteJson("/api/conversations/{$group->id}")->assertNoContent();
        $this->assertModelExists($group);
        $this->assertDatabaseMissing('conversation_user', ['conversation_id' => $group->id, 'user_id' => $member->id]);

        $this->signIn($owner);
        $this->deleteJson("/api/conversations/{$group->id}")->assertNoContent();
        $this->assertModelMissing($group);
    }
}
