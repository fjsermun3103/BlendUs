<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class MarketplaceSeeder extends Seeder
{
    public function run(): void
    {
        $products = [
            [
                'name' => 'BlendUs Pro Mixer 9000',
                'description' => 'The ultimate high-performance blender. Crushes ice, seeds, and frozen fruit with ease. Features a 1200W motor and a noise-reduction shield.',
                'price_cents' => 14999,
                'image_url' => '/assets/marketplace/blender.webp',
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Premium Ceremonial Matcha',
                'description' => '100% organic ceremonial grade matcha from Uji, Japan. Perfect for green smoothies or a morning latte. Rich in antioxidants.',
                'price_cents' => 3450,
                'image_url' => '/assets/marketplace/matcha.webp',
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Reusable Bamboo Straws (Pack of 10)',
                'description' => 'Eco-friendly, sustainable bamboo straws. Wide enough for the thickest smoothies. Includes a cleaning brush and a cotton pouch.',
                'price_cents' => 1299,
                'image_url' => '/assets/marketplace/straws.webp',
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Glass Smoothie Tumbler 500ml',
                'description' => 'Double-walled borosilicate glass tumbler with a silicone protective sleeve and a leak-proof bamboo lid.',
                'price_cents' => 2400,
                'image_url' => '/assets/marketplace/tumbler.webp',
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Organic Vegan Vanilla Protein',
                'description' => 'Plant-based protein powder made from peas, brown rice, and chia. Smooth texture, zero grit, and sweetened with stevia.',
                'price_cents' => 4500,
                'image_url' => '/assets/marketplace/protein.webp',
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Açaí Berry Puree Packs',
                'description' => 'Unsweetened organic açaí berry packs frozen at peak freshness. Perfect base for your smoothie bowls.',
                'price_cents' => 2200,
                'image_url' => '/assets/marketplace/acai.webp',
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'The BlendUs Recipe Book',
                'description' => '100+ creative and healthy smoothie recipes, including detox blends, protein shakes, and dessert alternatives.',
                'price_cents' => 1850,
                'image_url' => '/assets/marketplace/book.webp',
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Portable Mini Blender USB-C',
                'description' => 'Blend on the go! Compact, rechargeable blender perfect for the office, gym, or traveling. 350ml capacity.',
                'price_cents' => 3999,
                'image_url' => '/assets/marketplace/miniblender.webp',
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        ];

        DB::table('products')->insert($products);
    }
}
