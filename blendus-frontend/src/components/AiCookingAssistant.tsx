import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import type { Post } from '../lib/api';
import './AiCookingAssistant.css';

interface Props {
    post: Post;
    onClose: () => void;
}

export default function AiCookingAssistant({ post, onClose }: Props) {
    const [steps, setSteps] = useState<{instruction: string, tip?: string}[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loadingSteps, setLoadingSteps] = useState(true);
    
    const [chat, setChat] = useState<{sender: 'ai' | 'user', text: string}[]>([]);
    const [message, setMessage] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    useEffect(() => {
        const loadSteps = async () => {
            try {
                const res = await api.generateCookingSteps(post.title, post.ingredients ?? [], post.preparation_steps);
                setSteps(res.steps || [{instruction: post.preparation_steps}]);
            } catch (err) {
                setSteps([{instruction: post.preparation_steps}]);
            } finally {
                setLoadingSteps(false);
            }
        };
        loadSteps();
    }, [post]);

    useEffect(() => {
         chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chat, isThinking]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!message.trim() || isThinking || loadingSteps) return;

        const userMsg = message;
        setMessage('');
        setChat(prev => [...prev, { sender: 'user', text: userMsg }]);
        setIsThinking(true);

        try {
            const currentStep = steps[currentIndex]?.instruction || "";
            const res = await api.getCookingHelp(post.title, currentStep, userMsg);
            setChat(prev => [...prev, { sender: 'ai', text: res.answer }]);
        } catch (err) {
            setChat(prev => [...prev, { sender: 'ai', text: "Sorry, I lost my connection to the kitchen. Try asking again!" }]);
        } finally {
            setIsThinking(false);
        }
    };

    return (
        <div className="cooking-assistant-overlay">
            <div className="cooking-assistant-modal">
                <button className="close-btn" onClick={onClose}>
                    <img src="/cross-cooking.svg" alt="Close"  />
                </button>
                
                {loadingSteps ? (
                    <div className="cooking-loading">
                        <div className="spinner"></div>
                        <p>Chef Enrique is reading the recipe...</p>
                    </div>
                ) : (
                    <div className="cooking-split">
                        {/* Left Side: Steps */}
                        <div className="cooking-steps">
                            <div className="progress-container">
                                <span>Step {currentIndex + 1} of {steps.length}</span>
                                <span>{Math.round(((currentIndex + 1) / steps.length) * 100)}%</span>
                            </div>
                            <div className="progress-bar">
                                <div className="progress-fill" style={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}></div>
                            </div>
                            <div className="current-step-content">
                                <h2>{steps[currentIndex]?.instruction}</h2>
                                {steps[currentIndex]?.tip && (
                                    <p className="step-tip">💡 Tip: {steps[currentIndex].tip}</p>
                                )}
                            </div>

                            <div className="step-navigation">
                                <button 
                                    className="nav-btn prev" 
                                    disabled={currentIndex === 0} 
                                    onClick={() => setCurrentIndex(c => c - 1)}
                                >
                                    &larr; PREVIOUS
                                </button>
                                <button 
                                    className="nav-btn next" 
                                    disabled={currentIndex === steps.length - 1} 
                                    onClick={() => setCurrentIndex(c => c + 1)}
                                >
                                    NEXT &rarr;
                                </button>
                            </div>
                        </div>

                        {/* Right Side: Chat */}
                        <div className="cooking-chat">
                            <div className="chat-header">
                                <div className="ai-avatar">👨‍🍳</div>
                                <div>
                                    <h4>Chef Enrique</h4>
                                    <span className="ai-status">AI Assistant</span>
                                </div>
                            </div>
                            
                            <div className="chat-history">
                                {chat.length === 0 && (
                                    <p className="welcome-msg">Hello! I'm Enrique. Need help with this step?</p>
                                )}
                                {chat.map((msg, i) => (
                                    <div key={i} className={`chat-bubble ${msg.sender}`}>
                                        {msg.text}
                                    </div>
                                ))}
                                {isThinking && (
                                    <div className="chat-bubble ai thinking">
                                        <span>.</span><span>.</span><span>.</span>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            <form className="chat-input" onSubmit={handleSend}>
                                <input 
                                    type="text" 
                                    placeholder="Ask Chef Enrique a question..." 
                                    value={message} 
                                    onChange={e => setMessage(e.target.value)}
                                />
                                <button type="submit" disabled={!message.trim() || isThinking}>
                                    <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M5 12h14M12 5l7 7-7 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
