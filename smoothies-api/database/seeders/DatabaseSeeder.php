<?php

namespace Database\Seeders;

use App\Models\Post;
use App\Models\Tag;
use App\Models\User;
use App\Models\Ingredient;
use App\Services\EmbeddingService;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function __construct(
        protected EmbeddingService $embeddingService
    ) {}

    public function run(): void
    {
        // Guard: skip seeding if data already exists (prevents duplicates on container restart)
        if (User::count() > 0) {
            $this->command->info('Database already seeded, skipping.');
            return;
        }

        // Test users
        $testUser = User::factory()->create([
            'name'     => 'Test User',
            'username' => 'testuser',
            'email'    => 'test@example.com',
        ]);

        $nico = User::factory()->create([
            'name'     => 'Nico',
            'username' => 'nico',
            'email'    => 'nico@test.com',
            'password' => bcrypt('password123'),
        ]);

        $paco = User::factory()->create([
            'name'     => 'Paco',
            'username' => 'paco',
            'email'    => 'paco@test.com',
            'password' => bcrypt('password123'),
        ]);

        // Tags
        $tags = collect(['green', 'tropical', 'berry', 'protein', 'detox', 'dessert'])
            ->map(fn ($name) => Tag::create(['name' => $name]));

        // Sample posts
        $posts = [
            [
                'user' => $testUser,
                'title' => 'Green Detox Morning',
                'description' => 'Start your day with this amazing green detox smoothie! 🥬',
                'preparation_steps' => 'Blend all ingredients until smooth. Serve immediately.',
                'image_url' => null,
                'tag_names' => ['green', 'detox'],
                'ingredients' => [
                    ['name' => 'Spinach', 'quantity' => 100, 'unit' => 'g'],
                    ['name' => 'Banana', 'quantity' => 1, 'unit' => 'piece'],
                    ['name' => 'Almond milk', 'quantity' => 250, 'unit' => 'ml'],
                ],
            ],
            [
                'user' => $nico,
                'title' => 'Tropical Paradise',
                'description' => 'A refreshing taste of the tropics 🍍🥭',
                'preparation_steps' => 'Combine all fruit, add coconut water and blend until creamy.',
                'image_url' => null,
                'tag_names' => ['tropical'],
                'ingredients' => [
                    ['name' => 'Mango', 'quantity' => 150, 'unit' => 'g'],
                    ['name' => 'Pineapple', 'quantity' => 100, 'unit' => 'g'],
                    ['name' => 'Coconut water', 'quantity' => 200, 'unit' => 'ml'],
                ],
            ],
            [
                'user' => $paco,
                'title' => 'Berry Blast',
                'description' => 'Packed with antioxidants from three different berries 🫐🍓',
                'preparation_steps' => 'Blend berries with yogurt and honey until smooth.',
                'image_url' => null,
                'tag_names' => ['berry'],
                'ingredients' => [
                    ['name' => 'Blueberries', 'quantity' => 80, 'unit' => 'g'],
                    ['name' => 'Strawberries', 'quantity' => 80, 'unit' => 'g'],
                    ['name' => 'Greek yogurt', 'quantity' => 120, 'unit' => 'g'],
                    ['name' => 'Honey', 'quantity' => 1, 'unit' => 'tbsp'],
                ],
            ],
            [
                'user' => $testUser,
                'title' => 'Protein Power Shake',
                'description' => 'Post-workout recovery smoothie with 30g protein 💪',
                'preparation_steps' => 'Add protein powder last. Blend on high for 60 seconds.',
                'image_url' => null,
                'tag_names' => ['protein'],
                'ingredients' => [
                    ['name' => 'Whey protein', 'quantity' => 30, 'unit' => 'g'],
                    ['name' => 'Banana', 'quantity' => 1, 'unit' => 'piece'],
                    ['name' => 'Oat milk', 'quantity' => 300, 'unit' => 'ml'],
                    ['name' => 'Peanut butter', 'quantity' => 2, 'unit' => 'tbsp'],
                ],
            ],
        ];

        foreach ($posts as $postData) {
            $post = $postData['user']->posts()->create([
                'title'             => $postData['title'],
                'description'       => $postData['description'],
                'preparation_steps' => $postData['preparation_steps'],
                'image_url'         => $postData['image_url'],
            ]);

            $tagIds = $tags->whereIn('name', $postData['tag_names'])->pluck('id');
            $post->tags()->sync($tagIds);

            foreach ($postData['ingredients'] as $ing) {
                $post->ingredients()->create($ing);
            }

            // Generate AI Embedding
            $this->embeddingService->updatePostEmbedding($post);
        }
        $this->call([
            SampleDataSeeder::class,
            MarketplaceSeeder::class,
        ]);
    }
}
