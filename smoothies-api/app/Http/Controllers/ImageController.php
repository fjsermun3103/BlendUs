<?php

namespace App\Http\Controllers;

use App\Models\UploadedImage;
use Illuminate\Http\Response;

class ImageController extends Controller
{
    /** Serves an image stored by App\Services\ImageStorage in database mode. */
    public function show(UploadedImage $image): Response
    {
        return response(base64_decode($image->data), 200, [
            'Content-Type' => $image->mime_type,
            // The id is random and the content never changes
            'Cache-Control' => 'public, max-age=31536000, immutable',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
