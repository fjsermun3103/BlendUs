<?php
require '/home/david/smoothies-app/David/Prototipo-version/smoothies-api/vendor/autoload.php';
$app = require_once '/home/david/smoothies-app/David/Prototipo-version/smoothies-api/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$user = App\Models\User::first();
echo "User: " . $user->email . "\n";
echo "Liking post 24...\n";
App\Models\Like::firstOrCreate([
    'user_id' => $user->id,
    'likeable_id' => 24,
    'likeable_type' => App\Models\Post::class,
]);
App\Models\Post::find(24)->savedBy()->syncWithoutDetaching([$user->id]);

$service = app(App\Services\PostService::class);
auth()->login($user);
$posts = $service->getFeed(5);
foreach ($posts as $post) {
    if ($post->id === 24) {
        $resource = new App\Http\Resources\PostResource($post);
        $arr = $resource->toArray(request());
        echo "Post 24 likes_count: " . $arr['likes_count'] . "\n";
        echo "Post 24 has_liked: " . ($arr['has_liked'] ? 'true' : 'false') . "\n";
        echo "Post 24 has_saved: " . ($arr['has_saved'] ? 'true' : 'false') . "\n";
    }
}
