import './AiUnavailableNotice.css';

interface Props {
    /** Name of the feature, e.g. "The AI Sommelier" */
    feature: string;
    /** One-line version for buttons and widgets */
    compact?: boolean;
    /** Replaces the default explanation */
    children?: React.ReactNode;
}

/** Explains why an AI feature does not work in the free online demo (see lib/features.ts). */
export default function AiUnavailableNotice({ feature, compact = false, children }: Props) {
    if (compact) {
        return (
            <p className="ai-unavailable ai-unavailable--compact" role="note">
                <span aria-hidden="true">🔌</span> {children ?? `${feature} is not available in this online demo.`}
            </p>
        );
    }

    return (
        <div className="ai-unavailable" role="note">
            <span className="ai-unavailable-icon" aria-hidden="true">🔌</span>
            <div>
                <strong>{feature} is not available in this online demo</strong>
                <p className="ai-unavailable-text">
                    {children ?? (
                        <>
                            BlendUs's AI runs on local language models (Ollama) that need more memory than the free
                            hosting of this demo provides. Everything else works normally, and the AI is fully
                            available when the project runs locally with Docker.
                        </>
                    )}
                </p>
            </div>
        </div>
    );
}
