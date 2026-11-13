<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('uploaded_images', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('mime_type');
            // Base64 text: PDO sends bound values as text, which breaks raw binary in a bytea column
            $table->longText('data');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('uploaded_images');
    }
};
