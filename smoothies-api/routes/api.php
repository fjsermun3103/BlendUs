<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CommentController;
use App\Http\Controllers\ConversationController;
use App\Http\Controllers\LikeController;
use App\Http\Controllers\MarketplaceController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\PostController;
use App\Http\Controllers\StripeWebhookController;
use App\Http\Controllers\TagController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\AiController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->post('logout', [AuthController::class, 'logout']);
});

Route::prefix('users')->group(function () {
    Route::get('/', [UserController::class, 'index']);
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('suggested', [UserController::class, 'suggested']);
    });

    Route::get('{user}', [UserController::class, 'show']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('{user}/followers', [UserController::class, 'followers']);
        Route::get('{user}/following', [UserController::class, 'following']);
        Route::get('{user}/saved-posts', [UserController::class, 'saved_posts']);
        Route::get('{user}/liked-posts', [UserController::class, 'liked_posts']);
        Route::put('{user}', [UserController::class, 'update']);
        Route::post('{user}/follow', [UserController::class, 'follow']);
        Route::delete('{user}/follow', [UserController::class, 'unfollow']);
    });
});

Route::prefix('posts')->group(function () {
    Route::get('/', [PostController::class, 'index']);
    Route::middleware('auth:sanctum')->get('/personalized', [PostController::class, 'personalized']);
    Route::get('{post}', [PostController::class, 'show']);

    Route::prefix('{post}/comments')->group(function () {
        Route::get('/', [CommentController::class, 'index']);

        Route::middleware('auth:sanctum')->group(function () {
            Route::post('/', [CommentController::class, 'store']);
            Route::delete('{comment}', [CommentController::class, 'destroy']);
        });
    });

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/', [PostController::class, 'store']);
        Route::put('{post}', [PostController::class, 'update']);
        Route::delete('{post}', [PostController::class, 'destroy']);
        Route::post('{post}/save', [PostController::class, 'toggleSave']);
    });
});

Route::get('tags', [TagController::class, 'index']);
Route::get('tags/{tag}/posts', [PostController::class, 'byTag']);

Route::middleware('auth:sanctum')->post('likes', [LikeController::class, 'toggle']);

Route::middleware('auth:sanctum')->prefix('conversations')->group(function () {
    Route::get('/', [ConversationController::class, 'index']);
    Route::post('/', [ConversationController::class, 'store']);
    Route::get('{conversation}', [ConversationController::class, 'show']);
    Route::put('{conversation}', [ConversationController::class, 'update']);
    Route::delete('{conversation}', [ConversationController::class, 'destroy']);

    Route::post('{conversation}/members', [ConversationController::class, 'addMember']);
    Route::delete('{conversation}/members/{user}', [ConversationController::class, 'removeMember']);

    Route::get('{conversation}/messages', [MessageController::class, 'index']);
    Route::post('{conversation}/messages', [MessageController::class, 'store']);
    Route::delete('{conversation}/messages/{message}', [MessageController::class, 'destroy']);
});

Route::middleware('auth:sanctum')->post('ai/generate-smoothie', [AiController::class, 'generateSmoothie']);
Route::middleware('auth:sanctum')->post('ai/sommelier', [AiController::class, 'sommelier']);
Route::middleware('auth:sanctum')->post('ai/extract-steps', [AiController::class, 'extractSteps']);
Route::middleware('auth:sanctum')->post('ai/cooking-help', [AiController::class, 'cookingHelp']);

Route::prefix('marketplace')->group(function () {
    Route::get('products', [MarketplaceController::class, 'index']);
    Route::get('products/{product}', [MarketplaceController::class, 'show']);

    Route::middleware('auth:sanctum')->post('products/{product}/checkout', [MarketplaceController::class, 'checkout']);
});

Route::post('stripe/webhook', [StripeWebhookController::class, 'handle']);
