<?php

namespace App\Http\Controllers;

use App\Http\Requests\Conversation\StoreConversationRequest;
use App\Http\Requests\Conversation\UpdateConversationRequest;
use App\Http\Resources\ConversationResource;
use App\Models\Conversation;
use App\Models\User;
use Illuminate\Http\Request;

class ConversationController extends Controller
{
    public function index(Request $request)
    {
        $conversations = $request->user()
            ->conversations()
            ->with(['lastMessage.sender', 'participants'])
            ->orderByDesc(
                \App\Models\Message::select('created_at')
                    ->whereColumn('conversation_id', 'conversations.id')
                    ->latest()
                    ->limit(1)
            )
            ->paginate(20);

        return ConversationResource::collection($conversations);
    }

    public function store(StoreConversationRequest $request)
    {
        $user = $request->user();
        $data = $request->validated();

        if ($data['type'] === 'dm') {
            $existing = $user->conversations()
                ->where('type', 'dm')
                ->whereHas('participants', fn($q) => $q->where('user_id', $data['user_id']))
                ->first();

            if ($existing) {
                return new ConversationResource(
                    $existing->load(['lastMessage.sender', 'participants'])
                );
            }

            $conversation = Conversation::create(['type' => 'dm']);
            $conversation->participants()->attach([
                $user->id          => ['role' => 'member'],
                $data['user_id']   => ['role' => 'member'],
            ]);
        } else {
            $conversation = Conversation::create([
                'type'        => 'group',
                'name'        => $data['name'],
                'description' => $data['description'] ?? null,
                'owner_id'    => $user->id,
            ]);

            $members = [$user->id => ['role' => 'admin']];
            foreach ($data['user_ids'] as $id) {
                $members[$id] = ['role' => 'member'];
            }
            $conversation->participants()->attach($members);
        }

        return new ConversationResource(
            $conversation->load(['lastMessage.sender', 'participants'])
        );
    }

    public function show(Request $request, Conversation $conversation)
    {
        $this->authorize('view', $conversation);

        return new ConversationResource(
            $conversation->load(['participants', 'lastMessage.sender'])
        );
    }

    public function update(UpdateConversationRequest $request, Conversation $conversation)
    {
        $this->authorize('update', $conversation);

        $conversation->update($request->validated());

        return new ConversationResource(
            $conversation->load(['participants', 'lastMessage.sender'])
        );
    }

    public function destroy(Request $request, Conversation $conversation)
    {
        $this->authorize('view', $conversation);

        $user = $request->user();

        if ($conversation->type === 'group' && $conversation->owner_id === $user->id) {
            $conversation->delete();
        } else {
            $conversation->participants()->detach($user->id);
        }

        return response()->noContent();
    }

    public function addMember(Request $request, Conversation $conversation)
    {
        $this->authorize('manage', $conversation);

        $request->validate(['user_id' => 'required|exists:users,id']);

        $conversation->participants()->syncWithoutDetaching([
            $request->user_id => ['role' => 'member'],
        ]);

        return new ConversationResource(
            $conversation->load(['participants', 'lastMessage.sender'])
        );
    }

    public function removeMember(Request $request, Conversation $conversation, User $user)
    {
        $this->authorize('manage', $conversation);

        $conversation->participants()->detach($user->id);

        return response()->noContent();
    }
}
