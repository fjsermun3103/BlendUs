<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ConversationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'type'         => $this->type,
            'name'         => $this->when($this->type === 'group', $this->name),
            'description'  => $this->when($this->type === 'group', $this->description),
            'avatar'       => $this->when($this->type === 'group', $this->avatar),
            'owner_id'     => $this->when($this->type === 'group', $this->owner_id),
            'participants' => UserResource::collection($this->whenLoaded('participants')),
            'last_message' => new MessageResource($this->whenLoaded('lastMessage')),
            'created_at'   => $this->created_at,
        ];
    }
}
