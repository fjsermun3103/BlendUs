<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // The login form accepts "Username or email"; the field keeps its name for API compatibility.
            'email' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string'],
        ];
    }
}

