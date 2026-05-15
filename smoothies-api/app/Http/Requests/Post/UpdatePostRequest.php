<?php

namespace App\Http\Requests\Post;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePostRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'string'],
            'preparation_steps' => ['sometimes', 'string'],
            'image_url' => ['sometimes', 'nullable', 'url'],

            'ingredients' => ['sometimes', 'array', 'min:1'],
            'ingredients.*.name' => ['required_with:ingredients', 'string'],
            'ingredients.*.quantity' => ['required_with:ingredients', 'numeric', 'min:0'],
            'ingredients.*.unit' => ['required_with:ingredients', 'string'],

            'tags' => ['sometimes', 'array'],
            'tags.*' => ['string', 'max:50'],
        ];
    }
}

