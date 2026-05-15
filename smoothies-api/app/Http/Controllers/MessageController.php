<?php

namespace App\Http\Controllers;

use App\Http\Requests\Conversation\StoreMessageRequest;
use App\Http\Resources\MessageResource;
use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    public function index(Request $request, Conversation $conversation)
    {
        $this->authorize('view', $conversation);

        $conversation->participants()->updateExistingPivot($request->user()->id, [
            'last_read_at' => now(),
        ]);

        $messages = $conversation->messages()
            ->with('sender')
            ->latest()
            ->paginate(30);

        return MessageResource::collection($messages);
    }

    public function store(StoreMessageRequest $request, Conversation $conversation)
    {
        $this->authorize('view', $conversation);

        $message = $conversation->messages()->create([
            'user_id' => $request->user()->id,
            'body'    => $request->validated()['body'],
        ]);

        return new MessageResource($message->load('sender'));
    }

    public function destroy(Request $request, Conversation $conversation, Message $message)
    {
        $this->authorize('delete', $message);

        $message->delete();

        return response()->noContent();
    }
}
