import { useState } from 'react';
import PostCard from './PostCard';
import type { Post } from '../lib/api';
import { $isLoggedIn } from '../stores/authStore';
import './SommelierPage.css';

const renderBoldText = (text: string) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) => i % 2 === 1 ? <strong key={i} style={{ color: '#B45309' }}>{part}</strong> : part);
};

export default function SommelierPage() {
    const [mood, setMood] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<{ explanation: string; posts: Post[] } | null>(null);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        
        if (!$isLoggedIn.get()) {
            window.location.href = '/login';
            return;
        }

        if (!mood.trim()) {
            setError('Please tell us how you are feeling.');
            return;
        }

        setLoading(true);
        setError('');
        setResult(null);

        try {
            const token = localStorage.getItem('blendus_token');
            const apiUrl = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:8000';
            const res = await fetch(`${apiUrl}/api/ai/sommelier`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ mood: mood.trim() }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to reach the sommelier.');
            }

            setResult(data);
        } catch (err: any) {
            setError(err.message || 'An error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="sommelier-container">
            <div className="sommelier-hero">
                <span className="sommelier-icon">🧋✨</span>
                <h1>BlendUs AI Sommelier</h1>
                <p>Tell us how you're feeling, what you need, or what you've done today. We'll pick the perfect smoothies for your mood.</p>
                
                <form className="sommelier-search" onSubmit={handleSearch}>
                    <input 
                        type="text" 
                        placeholder="E.g. I just finished a heavy workout and need recovery..."
                        value={mood}
                        onChange={(e) => setMood(e.target.value)}
                        disabled={loading}
                        maxLength={200}
                    />
                    <button type="submit" disabled={loading || !mood.trim()}>
                        {loading ? 'Thinking...' : 'Match Smoothies'}
                    </button>
                </form>
                {error && <p className="sommelier-error">{error}</p>}
            </div>

            {loading && (
                <div className="sommelier-loading">
                    <div className="spinner"></div>
                    <p>Consulting our recipes and analyzing your mood...</p>
                </div>
            )}

            {result && (
                <div className="sommelier-results">
                    <div className="sommelier-explanation">
                        <h3>Here is what I recommend for you:</h3>
                        <p>{renderBoldText(result.explanation)}</p>
                    </div>

                    <div className="sommelier-posts-grid">
                        {result.posts.map(post => (
                            <PostCard key={post.id} post={post} />
                        ))}
                        {result.posts.length === 0 && (
                            <p>No suitable smoothies found in our inventory right now.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
