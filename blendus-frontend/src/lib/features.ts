/**
 * Feature flags set at build time.
 *
 * PUBLIC_AI_ENABLED=false builds the site for the free online demo, whose API runs without the AI models
 * (AI_ENABLED=false in the backend). AI features then show a notice instead of failing.
 */
export const AI_ENABLED = import.meta.env.PUBLIC_AI_ENABLED !== 'false';
