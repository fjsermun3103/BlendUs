<?php

namespace App\Services;

use App\Models\UploadedImage;
use Illuminate\Http\UploadedFile;

/**
 * Stores uploaded post photos and avatars and returns their public URL.
 *
 * By default files go to the "public" disk (served from /storage). With IMAGES_IN_DATABASE=true they are
 * saved in PostgreSQL and served from /api/images/{id}: free hosts like Render wipe the disk on every
 * restart, which would leave the demo full of broken images.
 */
class ImageStorage
{
    public function store(UploadedFile $file, string $folder): string
    {
        if (config('filesystems.images_in_database')) {
            $image = UploadedImage::create([
                'mime_type' => $file->getMimeType(),
                'data' => base64_encode($file->get()),
            ]);

            return url('/api/images/' . $image->id);
        }

        return url('/storage/' . $file->store($folder, 'public'));
    }
}
