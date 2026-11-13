import { AI_ENABLED } from '../lib/features';
import AiUnavailableNotice from './AiUnavailableNotice';
import './SommelierWidget.css';

export default function SommelierWidget() {
    return (
        <div className="sommelier-widget">
            <div className="sommelier-widget-body">
                <h2>AI Sommelier</h2>
                <p>Not sure what to blend? Describe your mood and Chef Enrique will pick the perfect smoothie for you.</p>
                <a href="/sommelier" className="sommelier-widget-btn">
                    Ask Sommelier ✨
                </a>
                {!AI_ENABLED && <AiUnavailableNotice feature="The AI Sommelier" compact />}
            </div>
        </div>
    );
}
