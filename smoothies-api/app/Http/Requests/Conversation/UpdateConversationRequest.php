<?php

namespace App\Http\Requests\Conversation;

use Illuminate\Foundation\Http\FormRequest;

class UpdateConversationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'        => 'sometimes|string|max:100',
            'description' => 'nullable|string|max:500',
            'avatar'      => 'nullable|string|max:2048',
        ];
    }
}
