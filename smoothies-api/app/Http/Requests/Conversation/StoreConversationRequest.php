<?php

namespace App\Http\Requests\Conversation;

use Illuminate\Foundation\Http\FormRequest;

class StoreConversationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type'      => 'required|in:dm,group',
            'user_id'   => 'required_if:type,dm|exists:users,id',
            'name'      => 'required_if:type,group|string|max:100',
            'description' => 'nullable|string|max:500',
            'user_ids'  => 'required_if:type,group|array|min:1',
            'user_ids.*' => 'exists:users,id',
        ];
    }
}
