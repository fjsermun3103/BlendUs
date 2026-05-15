<?php
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$user1 = App\Models\User::find(1); // the logged in user
$user2 = App\Models\User::find(2); // the user we view

if(!$user1 || !$user2) die("Users not found\n");
echo "Current followers of User 2: " . $user2->followers()->count() . "\n";

App\Services\UserService::class; // just trigger autoload
$service = app(App\Services\UserService::class);

echo "User 1 follows User 2...\n";
$service->follow($user1, $user2);
echo "New followers of User 2: " . $user2->followers()->count() . "\n";

echo "User 1 follows User 2 AGAIN...\n";
$service->follow($user1, $user2);
echo "New followers of User 2 after second follow: " . $user2->followers()->count() . "\n";

auth()->login($user1);
$resource = new App\Http\Resources\UserResource($user2);
$resourceArr = $resource->toArray(request());
echo "is_following: " . ($resourceArr['is_following'] ?? 'false') . "\n";

$resource2 = new App\Http\Resources\UserResource(App\Models\User::withCount(['followers'])->find(2));
$resourceArr2 = $resource2->toArray(request());
echo "followers_count: " . ($resourceArr2['followers_count'] ?? 'false') . "\n";
