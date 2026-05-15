<?php

namespace Database\Seeders;

use App\Models\Post;
use App\Models\Tag;
use App\Models\User;
use App\Models\Like;
use App\Services\EmbeddingService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Arr;

class SampleDataSeeder extends Seeder
{
    public function __construct(
        protected EmbeddingService $embeddingService
    ) {}

    public function run(): void
    {
        $fruitAvatars = ['blueberry.webp', 'kiwi.webp', 'mango.webp', 'strawberry.webp'];
        // 1. Create a set of diverse users
        $users = User::factory()->count(12)->create()->each(function ($u) use ($fruitAvatars) {
            $u->update([
                'bio' => Arr::random([
                    'Smoothie enthusiast 🍓 | Fitness lover 💪',
                    'Always mixing something new! 🍍',
                    'Green juice addict 🥬',
                    'Healthy living, one glass at a time.',
                    'Professional mixologist (of smoothies) 🍹',
                    null
                ]),
                'avatar' => '/assets/avatars/' . Arr::random($fruitAvatars),
            ]);
        });

        $allUsers = User::all();

        // 2. Curated Assets Pool (Local Assets for 100% reliability)
        $smoothiePool = [
            [
                'title' => 'Midnight Berry Bliss',
                'desc' => 'A deep, antioxidant-rich blend of wild berries and greek yogurt.',
                'img' => '/assets/smoothie2.webp',
                'tags' => ['berry', 'dessert']
            ],
            [
                'title' => 'Emerald Energy Boost',
                'desc' => 'Kickstart your day with fresh kiwi, spinach, and a touch of ginger.',
                'img' => '/assets/smoothie3.webp',
                'tags' => ['green', 'detox']
            ],
            [
                'title' => 'Tropical Sunset Swirl',
                'desc' => 'Mango, pineapple, and coconut water for that vacation feeling 🏝️',
                'img' => '/assets/smoothie4.webp',
                'tags' => ['tropical']
            ],
            [
                'title' => 'Matcha Zen Morning',
                'desc' => 'Ceremonial grade matcha blended with oat milk and a hint of honey.',
                'img' => '/assets/smoothie5.webp',
                'tags' => ['green', 'detox']
            ],
            [
                'title' => 'Protein Power Pack',
                'desc' => 'Thick and creamy base topped with seeds and fresh fruit.',
                'img' => '/assets/smoothie6.webp',
                'tags' => ['protein', 'detox']
            ],
            [
                'title' => 'Vibrant Detox',
                'desc' => 'Orange, ginger, and turmeric for a vibrant immune boost.',
                'img' => '/assets/smoothie2.webp',
                'tags' => ['detox', 'green']
            ],
            [
                'title' => 'Island Paradise',
                'desc' => 'Fresh tropical vibes in a glass!',
                'img' => '/assets/smoothie3.webp',
                'tags' => ['tropical']
            ],
            [
                'title' => 'Mango Dragonfruit Dream',
                'desc' => 'Vibrant two-layered tropical blend.',
                'img' => '/assets/aismoothie1.webp',
                'tags' => ['tropical']
            ],
            [
                'title' => 'Chocolate Peanut Butter Bowl',
                'desc' => 'Rich chocolate smoothie bowl topped with superfoods.',
                'img' => '/assets/aismoothie2.webp',
                'tags' => ['protein', 'dessert']
            ],
            [
                'title' => 'Morning Green Detox',
                'desc' => 'Refreshing cucumber and mint juice.',
                'img' => '/assets/aismoothie3.webp',
                'tags' => ['green', 'detox']
            ],
            [
                'title' => 'Berry Antioxidant Blast',
                'desc' => 'Mixed berries for the perfect morning.',
                'img' => '/assets/img1.webp',
                'tags' => ['berry']
            ],
            [
                'title' => 'Super Green Glow',
                'desc' => 'Spinach, kale, and apple for a natural glow.',
                'img' => '/assets/img2.webp',
                'tags' => ['green']
            ],
            [
                'title' => 'Sunshine Citrus',
                'desc' => 'Orange, pineapple, and mango packed with vitamin C.',
                'img' => '/assets/img3.webp',
                'tags' => ['tropical']
            ],
            [
                'title' => 'Icy Dessert Mix',
                'desc' => 'Cool down with this sweet and healthy dessert substitute.',
                'img' => '/assets/smoothie4.webp',
                'tags' => ['dessert']
            ],
            [
                'title' => 'Secret Recipe (No Photo)',
                'desc' => 'A mysterious blend that tastes like magic but I forgot to take a photo!',
                'img' => null,
                'tags' => ['dessert']
            ]
        ];

        $allTags = Tag::all();
        $ingredientsList = ['Banana', 'Spinach', 'Blueberries', 'Almond Milk', 'Chia Seeds', 'Honey', 'Oats', 'Yogurt', 'Mango', 'Pineapple'];
        $commentPool = [
            'Wow, looks delicious! 😍',
            'I need to try this tomorrow morning.',
            'Can I use coconut milk instead of almond?',
            'The color is amazing! 🌈',
            'Perfect post-workout snack.',
            'My kids loved this one! Thanks for sharing.',
            'Added some extra ginger and it was perfect.',
            'Best smoothie ever! ⭐️⭐️⭐️⭐️⭐️',
        ];

        // 3. Create ~40 posts
        foreach (range(1, 40) as $i) {
            $poolItem = Arr::random($smoothiePool);
            $user = $allUsers->random();

            $post = Post::create([
                'user_id' => $user->id,
                'title' => $poolItem['title'] . ($i > 7 ? ' #' . $i : ''),
                'description' => $poolItem['desc'],
                'preparation_steps' => "1. Prep all ingredients. \n2. Place in blender. \n3. Blend for 60s until smooth. \n4. Pour and ENJOY! 🥤",
                'image_url' => $poolItem['img'],
            ]);

            $post->tags()->sync($allTags->whereIn('name', $poolItem['tags'])->pluck('id'));

            // Generate AI Embedding for the post
            $this->embeddingService->updatePostEmbedding($post);

            foreach (Arr::random($ingredientsList, rand(3, 5)) as $name) {
                $post->ingredients()->create([
                    'name' => $name,
                    'quantity' => rand(1, 100),
                    'unit' => Arr::random(['g', 'ml', 'unit', 'tbsp']),
                ]);
            }

            foreach ($allUsers->random(rand(2, 4)) as $commenter) {
                $post->comments()->create([
                    'user_id' => $commenter->id,
                    'body' => Arr::random($commentPool),
                ]);
            }
        }

        // 4. Social Simulation
        foreach ($allUsers as $u) {
            $u->following()->sync($allUsers->where('id', '!=', $u->id)->random(rand(3, 6))->pluck('id'));
        }

        $allPosts = Post::all();
        foreach ($allPosts as $p) {
            foreach ($allUsers->random(rand(2, 8)) as $liker) {
                Like::create([
                    'user_id' => $liker->id,
                    'likeable_id' => $p->id,
                    'likeable_type' => Post::class,
                ]);
            }
        }

        // 5. Direct Messages Simulation
        $messagePool = [
            'Hey, loved your last smoothie post!',
            'What blender do you use? It looks so smooth.',
            'Have you tried adding ginger to the tropical mix?',
            'Thanks for the follow! Let me know if you need recipe tips.',
            'That protein shake saved me after my workout today.',
            'Could I substitute almond milk for oat milk in that recipe?',
            'Your photography is amazing.',
        ];

        // Create 5 random conversations
        foreach (range(1, 5) as $i) {
            $participants = $allUsers->random(2);
            
            // Avoid DMing self
            if ($participants[0]->id === $participants[1]->id) continue;

            $conversation = \App\Models\Conversation::create([
                'type' => 'dm',
            ]);

            $conversation->participants()->attach([
                $participants[0]->id => ['role' => 'admin'],
                $participants[1]->id => ['role' => 'admin'],
            ]);

            // Create some messages
            foreach (range(1, rand(3, 8)) as $msgIndex) {
                $conversation->messages()->create([
                    'user_id' => $participants->random()->id,
                    'body' => \Illuminate\Support\Arr::random($messagePool),
                    'created_at' => now()->subMinutes(rand(1, 1000)),
                ]);
            }
        }
    }
}
