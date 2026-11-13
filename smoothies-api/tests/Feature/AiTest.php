<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/** AI endpoints with Ollama faked: we test our handling, not the model. */
class AiTest extends TestCase
{
    use RefreshDatabase;

    private function ollamaGenerates(array $json): void
    {
        $this->fakeHttp([
            'ollama.test/api/embeddings' => Http::response(['embedding' => array_fill(0, 768, 0.01)]),
            'ollama.test/api/generate' => Http::response(['response' => json_encode($json)]),
        ]);
    }

    public function test_generate_smoothie_returns_the_recipe_and_filters_hallucinated_ingredients(): void
    {
        $this->signIn();
        $this->ollamaGenerates([
            'name' => 'Sunrise Glow',
            'description' => 'Bright and fresh.',
            'ingredients' => [
                ['name' => 'Mango', 'amount' => '1 cup'],
                ['name' => 'Preparation steps', 'amount' => '-'],
            ],
            'tags' => ['tropical'],
            'category' => 'tropical',
            'preparation_steps' => ['Blend.'],
        ]);

        $this->postJson('/api/ai/generate-smoothie', ['prompt' => 'something with mango'])
            ->assertOk()
            ->assertJsonPath('name', 'Sunrise Glow')
            ->assertJsonCount(1, 'ingredients');

        Http::assertSent(fn ($r) => str_ends_with($r->url(), '/api/generate') && $r['model'] === 'llama3.2:1b');
    }

    public function test_generate_smoothie_validates_prompt(): void
    {
        $this->signIn();

        $this->postJson('/api/ai/generate-smoothie', ['prompt' => ''])->assertUnprocessable();
        $this->postJson('/api/ai/generate-smoothie', ['prompt' => str_repeat('a', 501)])->assertUnprocessable();
    }

    public function test_generate_smoothie_reports_ollama_unavailable(): void
    {
        $this->signIn();
        $this->fakeHttp(['ollama.test/*' => Http::failedConnection()]);

        $this->postJson('/api/ai/generate-smoothie', ['prompt' => 'mango'])->assertStatus(503);
    }

    public function test_generate_smoothie_reports_missing_model(): void
    {
        $this->signIn();
        $this->fakeHttp(['ollama.test/api/generate' => Http::response(['error' => "model 'llama3.2:1b' not found"], 404)]);

        $this->postJson('/api/ai/generate-smoothie', ['prompt' => 'mango'])->assertStatus(502);
    }

    public function test_sommelier_returns_recommended_posts_in_ai_order(): void
    {
        $this->signIn();
        $a = $this->createPost(attributes: ['title' => 'Mango Magic']);
        $b = $this->createPost(attributes: ['title' => 'Mango Dream']);
        $this->ollamaGenerates(['explanation' => 'Enjoy!', 'recommended_ids' => [$b->id, $a->id]]);

        $this->postJson('/api/ai/sommelier', ['mood' => 'I want mango'])
            ->assertOk()
            ->assertJsonPath('explanation', 'Enjoy!')
            ->assertJsonPath('posts.0.id', $b->id)
            ->assertJsonPath('posts.1.id', $a->id);
    }

    public function test_sommelier_returns_404_when_there_are_no_posts(): void
    {
        $this->signIn();
        $this->fakeHttp(['ollama.test/api/embeddings' => Http::response(['embedding' => array_fill(0, 768, 0.01)])]);

        $this->postJson('/api/ai/sommelier', ['mood' => 'happy'])->assertNotFound();
    }

    public function test_extract_steps_returns_steps(): void
    {
        $this->signIn();
        $this->ollamaGenerates(['steps' => [['instruction' => 'Peel the mango', 'tip' => 'Use a spoon']]]);

        $this->postJson('/api/ai/extract-steps', [
            'title' => 'Mango',
            'ingredients' => [['name' => 'Mango']],
            'preparation_steps' => 'Peel and blend.',
        ])->assertOk()->assertJsonPath('steps.0.instruction', 'Peel the mango');
    }

    public function test_extract_steps_reports_an_error_when_ollama_fails(): void
    {
        $this->signIn();
        $this->fakeHttp(['ollama.test/api/generate' => Http::response(['error' => 'model not found'], 404)]);

        $response = $this->postJson('/api/ai/extract-steps', [
            'title' => 'Mango',
            'ingredients' => [['name' => 'Mango']],
            'preparation_steps' => 'Peel and blend.',
        ]);

        $this->assertGreaterThanOrEqual(500, $response->status(), 'Ollama failure was returned as HTTP '.$response->status().' with body '.$response->getContent());
    }

    public function test_cooking_help_reports_an_error_when_ollama_fails(): void
    {
        $this->signIn();
        $this->fakeHttp(['ollama.test/api/generate' => Http::response(['error' => 'model not found'], 404)]);

        $response = $this->postJson('/api/ai/cooking-help', [
            'title' => 'Mango',
            'current_step' => 'Peel',
            'question' => 'How?',
        ]);

        $this->assertGreaterThanOrEqual(500, $response->status(), 'Ollama failure was returned as HTTP '.$response->status().' with body '.$response->getContent());
    }

    public function test_ai_endpoints_are_unavailable_when_ai_is_disabled(): void
    {
        config(['services.ai.enabled' => false]);
        $this->signIn();

        foreach (['generate-smoothie', 'sommelier', 'extract-steps', 'cooking-help'] as $endpoint) {
            $this->postJson("/api/ai/{$endpoint}", [])
                ->assertStatus(503)
                ->assertJsonPath('ai_disabled', true);
        }

        Http::assertNothingSent();
    }

    public function test_posts_are_created_without_embeddings_when_ai_is_disabled(): void
    {
        config(['services.ai.enabled' => false]);
        $this->signIn();

        $this->postJson('/api/posts', $this->validPostPayload())->assertCreated();

        $this->assertNull(\App\Models\Post::first()->embedding);
        Http::assertNothingSent();
    }
}
