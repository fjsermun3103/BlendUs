<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $fillable = ['name', 'description', 'price_cents', 'image_url', 'active'];

    protected $casts = [
        'active'      => 'boolean',
        'price_cents' => 'integer',
    ];

    public function getPriceEurosAttribute(): float
    {
        return $this->price_cents / 100;
    }
}
