import { useRef, useState, useEffect } from 'react';
import { api } from '../lib/api';
import type { Tag } from '../lib/api';
import { $isLoggedIn } from '../stores/authStore';
import './CreateForm.css';

interface IngredientRow {
    ingredient: string;
    amount: string;
}

export default function CreatePostForm() {
    const [ingredients, setIngredients] = useState<IngredientRow[]>([{ ingredient: '', amount: '' }]);
    const [tags, setTags] = useState<string[]>([]);
    const [availableTags, setAvailableTags] = useState<Tag[]>([]);
    const [tagInput, setTagInput] = useState('');

    // ── AI Generation state ──
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState('');
    const [aiOpen, setAiOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [instructions, setInstructions] = useState('');
    const [category, setCategory] = useState('');

    useEffect(() => {
        if (!$isLoggedIn.get()) {
            window.location.href = '/login';
            return;
        }
        api.getTags().then(setAvailableTags).catch(() => {});
    }, []);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── AI Generate handler ──
    const handleAiGenerate = async () => {
        const prompt = aiPrompt.trim();
        if (!prompt) {
            setAiError('Please describe the smoothie you want.');
            return;
        }

        setAiLoading(true);
        setAiError('');
        try {
            const token = localStorage.getItem('blendus_token');
            const apiUrl = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:8000';
            const res = await fetch(`${apiUrl}/api/ai/generate-smoothie`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ prompt }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to generate smoothie');
            }

            if (data.name) setTitle(data.name);
            if (data.description) setDescription(data.description);
            if (data.preparation_steps) {
                const formattedSteps = Array.isArray(data.preparation_steps) 
                    ? data.preparation_steps.join('\n\n') 
                    : data.preparation_steps;
                setInstructions(formattedSteps);
            }

            // Set category if it matches one of the options
            if (data.category) {
                const validCategories = ['green', 'tropical', 'berry', 'protein', 'detox', 'dessert'];
                const cat = data.category.toLowerCase();
                if (validCategories.includes(cat)) {
                    setCategory(cat);
                }
            }

            // Set ingredients
            if (data.ingredients && Array.isArray(data.ingredients)) {
                setIngredients(
                    data.ingredients.map((ing: any) => ({
                        ingredient: ing.name || '',
                        amount: ing.amount || '',
                    }))
                );
            }

            // Set tags
            if (data.tags && Array.isArray(data.tags)) {
                setTags(data.tags.slice(0, 5).map((t: string) => t.startsWith('#') ? t : '#' + t));
            }

            // Collapse AI section after success
            setAiOpen(false);
            setAiPrompt('');
        } catch (err: any) {
            setAiError(err.message ?? 'Something went wrong. Try again.');
        } finally {
            setAiLoading(false);
        }
    };

    // ── Ingredient helpers ──
    const addIngredient = () => setIngredients(prev => [...prev, { ingredient: '', amount: '' }]);
    const removeIngredient = (i: number) => setIngredients(prev => prev.filter((_, idx) => idx !== i));
    const handleIngredientChange = (i: number, field: keyof IngredientRow, value: string) => {
        setIngredients(prev => {
            const copy = [...prev];
            copy[i] = { ...copy[i], [field]: value };
            return copy;
        });
    };

    // ── Tag helpers ──
    const addTag = () => {
        let t = tagInput.trim();
        if (!t) return;
        if (!t.startsWith('#')) t = '#' + t;
        
        // Enforce max length of 19 characters (plus the #)
        if (t.length > 20) t = t.slice(0, 20);

        if (tags.length >= 5) {
            setTagInput('');
            return;
        }
        if (!tags.includes(t)) {
            setTags(prev => [...prev, t]);
        }
        setTagInput('');
    };
    const removeTag = (i: number) => setTags(prev => prev.filter((_, idx) => idx !== i));

    // ── File helpers ──
    const handleClick = () => fileInputRef.current?.click();
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setFile(f);
        setPreview(URL.createObjectURL(f));
    };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const f = e.dataTransfer.files[0];
        if (!f) return;
        setFile(f);
        setPreview(URL.createObjectURL(f));
    };
    const removeImage = () => {
        setFile(null);
        setPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // ── Submit ──
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!$isLoggedIn.get()) { window.location.href = '/login'; return; }

        if (!title || !description || !instructions) {
            setError('Please fill in the name, caption and instructions.');
            return;
        }

        // Parse ingredients into Nico's format: { name, quantity, unit }
        const parsedIngredients = ingredients
            .filter(i => i.ingredient.trim())
            .map(i => {
                const match = i.amount.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
                return {
                    name: i.ingredient.trim(),
                    quantity: match ? parseFloat(match[1]) : 1,
                    unit: match?.[2]?.trim() || 'piece',
                };
            });

        if (parsedIngredients.length === 0) {
            setError('Please add at least one ingredient.');
            return;
        }

        // Build FormData for file upload support
        const fd = new FormData();
        fd.append('title', title);
        fd.append('description', description);
        fd.append('preparation_steps', instructions);
        if (file) fd.append('image', file);
        if (category) fd.append('tags[]', category);
        tags.forEach(t => fd.append('tags[]', t.replace('#', '')));
        parsedIngredients.forEach((ing, idx) => {
            fd.append(`ingredients[${idx}][name]`, ing.name);
            fd.append(`ingredients[${idx}][quantity]`, String(ing.quantity));
            fd.append(`ingredients[${idx}][unit]`, ing.unit);
        });

        setLoading(true);
        setError('');
        try {
            await api.createPost(fd);
            setSuccess(true);
            setTimeout(() => { window.location.href = '/'; }, 1500);
        } catch (err: any) {
            setError(err.message ?? 'Failed to create post.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="form success-container">
                <div className="success-card">
                    <div className="success-icon-wrapper">
                        <div className="success-ring"></div>
                        <svg className="success-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <h2>Smoothie Shared!</h2>
                    <p>Your recipe is now available for the entire BlendUs community.</p>
                    <div className="success-loader">
                        <div className="success-progress"></div>
                    </div>
                    <span className="success-redirect-text">Redirecting to home...</span>
                </div>
            </div>
        );
    }

    return (
        <form className="form" onSubmit={handleSubmit}>
            {/* ── AI Generation Section ── */}
            <div className="ai-section">
                <div className="ai-header" onClick={() => setAiOpen(!aiOpen)}>
                    <div className="ai-title">
                        <span className="ai-sparkle">✨</span>
                        <span>Create with AI</span>
                    </div>
                    <svg
                        className={`ai-chevron ${aiOpen ? 'open' : ''}`}
                        xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"
                    >
                        <path d="M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z"/>
                    </svg>
                </div>

                {aiOpen && (
                    <div className="ai-body">
                        <p className="ai-hint">Describe the smoothie you want and our AI will create a complete recipe for you.</p>
                        <textarea
                            className="textarea ai-prompt"
                            placeholder="E.g. a refreshing tropical smoothie with mango, pineapple and coconut milk..."
                            value={aiPrompt}
                            onChange={e => setAiPrompt(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiGenerate(); } }}
                        />
                        {aiError && <p className="ai-error">{aiError}</p>}
                        <button
                            type="button"
                            className="btn ai-generate-btn"
                            onClick={handleAiGenerate}
                            disabled={aiLoading}
                        >
                            {aiLoading ? (
                                <>
                                    <span className="ai-spinner" />
                                    Generating…
                                </>
                            ) : (
                                <>
                                    <span className="ai-sparkle">✨</span>
                                    Generate Smoothie
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* Image upload */}
            <div
                className={`image ${isDragging ? 'dragging' : ''}`}
                onClick={handleClick}
                onDrop={handleDrop}
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
            >
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
                {preview ? (
                    <div className="preview-wrapper">
                        <img src={preview} alt="Preview" className="image-preview" />
                        <div className="delete-icon" onClick={e => { e.stopPropagation(); removeImage(); }}>
                            <svg xmlns="http://www.w3.org/2000/svg" height="32px" viewBox="0 -960 960 960" width="32px" fill="#E7000B">
                                <path d="M256-200l-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
                            </svg>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="camera-logo">
                            <svg xmlns="http://www.w3.org/2000/svg" height="48px" viewBox="0 -960 960 960" width="48px" fill="#bb4d00">
                                <path d="M479.5-267q72.5 0 121.5-49t49-121.5q0-72.5-49-121T479.5-607q-72.5 0-121 48.5t-48.5 121q0 72.5 48.5 121.5t121 49Zm0-60q-47.5 0-78.5-31.5t-31-79q0-47.5 31-78.5t78.5-31q47.5 0 79 31t31.5 78.5q0 47.5-31.5 79t-79 31.5ZM140-120q-24 0-42-18t-18-42v-513q0-23 18-41.5t42-18.5h147l73-87h240l73 87h147q23 0 41.5 18.5T880-693v513q0 24-18.5 42T820-120H140Zm0-60h680v-513H645l-73-87H388l-73 87H140v513Zm340-257Z"/>
                            </svg>
                        </div>
                        <h2>{file ? file.name : 'Add a photo of your smoothie'}</h2>
                        <h3>Drag and drop</h3>
                    </>
                )}
            </div>

            {/* Smoothie Name */}
            <div className="name">
                <label className="label" htmlFor="name">Smoothie Name</label>
                <input 
                    className="text-input" 
                    type="text" 
                    id="name" 
                    placeholder="Tropical Fruits Smoothie" 
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                />
            </div>

            {/* Category */}
            <div className="category">
                <label className="label" htmlFor="category">Category</label>
                <select 
                    className="text-input" 
                    id="category"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                >
                    <option value="" disabled>Choose a category</option>
                    <option value="green">🥬 Green</option>
                    <option value="tropical">🍍 Tropical</option>
                    <option value="berry">🫐 Berry</option>
                    <option value="protein">💪 Protein</option>
                    <option value="detox">🍃 Detox</option>
                    <option value="dessert">🍨 Dessert</option>
                </select>
            </div>

            {/* Caption */}
            <div className="caption">
                <label className="label" htmlFor="caption">Caption</label>
                <textarea 
                    className="textarea" 
                    id="caption" 
                    placeholder="Share your smoothie story..." 
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                />
            </div>

            {/* Ingredients */}
            <div className="ingredients-container">
                <div className="ingredients-header">
                    <label className="label">Ingredients</label>
                    <div className="add-button" onClick={addIngredient}>
                        <svg width="28px" height="28px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <line fill="none" stroke="#bb4d00" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" x1="12" x2="12" y1="19" y2="5"/>
                            <line fill="none" stroke="#bb4d00" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" x1="5" x2="19" y1="12" y2="12"/>
                        </svg>
                        <p>Add</p>
                    </div>
                </div>
                {ingredients.map((item, idx) => (
                    <div className="ingredients" key={idx}>
                        <input
                            className="text-input ingredient"
                            type="text"
                            placeholder="Ingredient"
                            value={item.ingredient}
                            onChange={e => handleIngredientChange(idx, 'ingredient', e.target.value)}
                        />
                        <input
                            className="text-input amount"
                            type="text"
                            placeholder="Amount (e.g. 200 g)"
                            value={item.amount}
                            onChange={e => handleIngredientChange(idx, 'amount', e.target.value)}
                        />
                        <div className="close-icon" onClick={() => removeIngredient(idx)}>
                            <svg xmlns="http://www.w3.org/2000/svg" height="30px" viewBox="0 -960 960 960" width="30px" fill="#99a1af">
                                <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
                            </svg>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tags */}
            <div className="tags-container">
                <label className="label">Tags</label>
                <div className="tags-list">
                    {tags.map((tag, idx) => (
                        <div className="tag" key={idx} onClick={() => removeTag(idx)}>
                            {tag} <span>✖</span>
                        </div>
                    ))}
                </div>
                <div className="tags">
                    <input
                        className="text-input"
                        type="text"
                        placeholder="Type a new tag..."
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                        maxLength={19}
                    />
                    <button type="button" className="btn add-btn" onClick={addTag}>Add</button>
                </div>
                
                {availableTags.length > 0 && (
                    <div className="available-tags" style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                        {availableTags
                            .filter(t => !tags.includes('#' + t.slug) && !tags.includes('#' + t.name.toLowerCase()))
                            .map(tag => (
                                <span
                                    key={tag.id}
                                    className="filter-pill"
                                    style={{ fontSize: '0.8rem', padding: '.4rem 1rem', cursor: 'pointer', background: '#f3f4f6', border: '1px solid #e5e7eb' }}
                                    onClick={() => {
                                        if (tags.length < 5) {
                                            setTags(prev => [...prev, '#' + tag.slug]);
                                        }
                                    }}
                                >
                                    + {tag.name}
                                </span>
                            ))}
                    </div>
                )}
            </div>

            {/* Instructions */}
            <div className="instructions">
                <label className="label" htmlFor="instructions">Instructions</label>
                <textarea 
                    className="textarea" 
                    id="instructions" 
                    placeholder="How to make this smoothie..." 
                    value={instructions}
                    onChange={e => setInstructions(e.target.value)}
                />
            </div>

            {error && <p style={{ color: '#E7000B', marginTop: '0.5rem', fontSize: '0.9rem' }}>{error}</p>}

            <button className="btn form-btn" type="submit" disabled={loading}>
                <svg xmlns="http://www.w3.org/2000/svg" height="40px" viewBox="0 -960 960 960" width="40px" fill="#fff">
                    <path d="M166.67-226.67q-38.67-45-59.34-99.66Q86.67-381 80-440h68.67Q156-395 172-353.17q16 41.84 44 77.84l-49.33 48.66ZM80-520q8.67-58.33 29.33-113 20.67-54.67 57.34-100.33L216-684.67q-28 36-44 77.84Q156-565 148.67-520H80ZM438-82q-58.33-6.67-112.83-27.5t-100.5-57.17l48.66-50.66q37 26.66 78.34 44.33Q393-155.33 438-148.67V-82ZM276-742.67l-51.33-50.66q47-36.34 102-57.17t114-27.5v66.67q-45 6.66-86.84 24Q312-770 276-742.67ZM518-82v-66.67q46-6.66 87.83-24.5 41.84-17.83 79.5-44.16L736-166.67Q689-129.33 633.5-109T518-82Zm169.33-660.67q-37-26.66-79-44.33-42-17.67-87.66-24.33V-878q59 6.67 113.5 27.83Q688.67-829 736-793.33l-48.67 50.66Zm106.67 516-48.67-48.66q27.34-36 43.34-77.84Q804.67-395 812-440h68.67q-8.67 58.33-29 113-20.34 54.67-57.67 100.33ZM812-520q-7.33-45-23.33-86.83-16-41.84-43.34-77.84L794-733.33q38.67 45 59.33 99.66Q874-579 880.67-520H812ZM447-280v-271.67L327.67-432.33 280.33-480l200-200 200 200-47.66 47.33-119-119V-280H447Z"/>
                </svg>
                {loading ? 'Sharing...' : 'Share Smoothie'}
            </button>
        </form>
    );
}
