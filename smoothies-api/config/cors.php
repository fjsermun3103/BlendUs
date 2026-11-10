<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    // Extra origins (comma separated) only matter if the frontend is served from another domain.
    'allowed_origins' => array_values(array_filter(array_merge(
        ['http://localhost:4321', 'http://localhost:3000'],
        array_map('trim', explode(',', (string) env('CORS_ALLOWED_ORIGINS', '')))
    ))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];
