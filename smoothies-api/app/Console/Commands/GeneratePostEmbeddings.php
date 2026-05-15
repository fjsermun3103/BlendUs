<?php

namespace App\Console\Commands;

use App\Models\Post;
use App\Services\EmbeddingService;
use Illuminate\Console\Command;

class GeneratePostEmbeddings extends Command
{
    protected $signature = 'smoothies:generate-embeddings {--force : Force regenerate all embeddings}';
    protected $description = 'Generate vector embeddings for all smoothies using Ollama';

    public function handle(EmbeddingService $embeddingService)
    {
        $query = Post::query();

        if (! $this->option('force')) {
            $query->whereNull('embedding');
        }

        $posts = $query->get();

        if ($posts->isEmpty()) {
            $this->info('No posts to process.');
            return;
        }

        $this->info("Processing {$posts->count()} posts...");
        $bar = $this->output->createProgressBar($posts->count());

        foreach ($posts as $post) {
            /** @var Post $post */
            $embeddingService->updatePostEmbedding($post);
            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info('Embeddings generated successfully!');
    }
}
