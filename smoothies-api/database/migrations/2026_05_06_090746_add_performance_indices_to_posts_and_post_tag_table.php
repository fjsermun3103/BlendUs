<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddPerformanceIndicesToPostsAndPostTagTable extends Migration
{
    public function up(): void
    {
        Schema::table("posts", function (Blueprint $table) {
            $table->index("created_at");
        });

        Schema::table("post_tag", function (Blueprint $table) {
            $table->index("tag_id");
        });
    }

    public function down(): void
    {
        Schema::table("posts", function (Blueprint $table) {
            $table->dropIndex(["created_at"]);
        });

        Schema::table("post_tag", function (Blueprint $table) {
            $table->dropIndex(["tag_id"]);
        });
    }
}
