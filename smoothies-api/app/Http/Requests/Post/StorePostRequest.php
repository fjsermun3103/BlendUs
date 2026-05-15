<?php

namespace App\Http\Requests\Post;

use Illuminate\Foundation\Http\FormRequest;

class StorePostRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'preparation_steps' => ['required', 'string'],
            'image' => ['nullable', 'image', 'max:5120'],
            'image_url' => ['nullable', 'string'],

            'ingredients' => ['required', 'array', 'min:1'],
            'ingredients.*.name' => ['required', 'string'],
            'ingredients.*.quantity' => ['required', 'numeric', 'min:0'],
            'ingredients.*.unit' => ['required', 'string'],

            'tags' => ['nullable', 'array'],
            'tags.*' => ['string', 'max:50'],
        ];
    }
}

