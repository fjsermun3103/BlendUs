<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/** An uploaded image kept in the database (see App\Services\ImageStorage). */
class UploadedImage extends Model
{
    use HasUuids;

    protected $fillable = ['mime_type', 'data'];

    protected $hidden = ['data'];
}
