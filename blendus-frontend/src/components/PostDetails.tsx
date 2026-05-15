import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import type { Post } from '../lib/api';
import { getDefaultAvatar, getInitials } from '../lib/utils';
import './PostDetails.css';
import './UserInfo.css';
import './IngredientsComponent.css';
import './CommentsComponent.css';
import { $isLoggedIn, $user } from '../stores/authStore';
import AiCookingAssistant from './AiCookingAssistant';

interface Props {
    postId: number;
}

export default function PostDetails({ postId }: Props) {
    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const [isCookingMode, setIsCookingMode] = useState(false);
    const optionsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (optionsRef.current && !optionsRef.current.contains(event.target as Node)) {
                setShowOptions(false);
            }
        };
        if (showOptions) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showOptions]);

    useEffect(() => {
        loadPost();
    }, [postId]);

    const loadPost = async () => {
        try {
            const [p, comms] = await Promise.all([
                api.getPost(postId),
                api.getComments(postId).catch(() => [])
            ]);
            p.comments = comms;
            setPost(p);
            setError(false);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim() || isSubmitting) return;
        if (!$isLoggedIn.get()) { window.location.href = '/login'; return; }
        setIsSubmitting(true);
        try {
            await api.createComment(postId, commentText);
            setCommentText('');
            loadPost(); // reload to get new comment
        } catch (err) {
            console.error('Failed to post comment', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLike = async () => {
        if (!$isLoggedIn.get()) { window.location.href = '/login'; return; }
        if (!post) return;
        const previousState = { ...post };
        setPost({
            ...post,
            has_liked: !post.has_liked,
            likes_count: post.has_liked ? post.likes_count - 1 : post.likes_count + 1
        });
        try {
            await api.likePost(post.id);
        } catch {
            setPost(previousState);
        }
    };

    const handleSave = async () => {
        if (!$isLoggedIn.get()) { window.location.href = '/login'; return; }
        if (!post) return;
        const previousState = { ...post };
        setPost({ ...post, has_saved: !post.has_saved });
        try {
            await api.toggleSavePost(post.id);
        } catch {
            setPost(previousState);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this smoothie? 🥤🗑️')) return;
        try {
            await api.deletePost(postId);
            window.location.href = '/';
        } catch (err) {
            alert('Failed to delete post');
        }
    };

    const isAuthor = $user.get()?.id === post?.author?.id;
    const saved = post?.has_saved ?? false;

    if (loading) return (
        <div className="loading-spinner" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#e17100" strokeWidth="2" strokeDasharray="50" strokeDashoffset="20">
                    <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
                </circle>
            </svg>
        </div>
    );

    if (error || !post) return (
        <div className="empty-state">
            <p>Post not found 🍹</p>
            <button onClick={() => window.history.back()} className="btn" style={{ display: 'inline-block', marginTop: '1rem', border: 'none', cursor: 'pointer' }}>Back to safety</button>
        </div>
    );

    return (
        <section className="show-wrapper">
            <section className="page-header">
                <div className="back" onClick={() => window.history.back()} style={{ cursor: 'pointer' }}>
                    <div className="back-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" height="28px" viewBox="0 -960 960 960" width="28px" fill="#4a5565">
                            <path d="m313-440 224 224-57 56-320-320 320-320 57 56-224 224h487v80H313Z" />
                        </svg>
                    </div>
                    <h3>Back</h3>
                </div>
            </section>
            
            <section className="post-info">
                <div className="post-user">
                    <a href={`/profile/${post.author.id}`} className="pfp-circle" style={{ width: 64, height: 64 }}>
                        {post.author.avatar ? (
                            <img src={post.author.avatar} alt={post.author.name} />
                        ) : (
                            <img src={getDefaultAvatar(post.author.id)} alt={post.author.name} />
                        )}
                    </a>
                    <div className="user-info">
                        <p className="name">{post.author.name}</p>
                        <p className="launch-date">{new Date(post.created_at).toLocaleDateString()}</p>
                    </div>
                </div>
            </section>
            <div className="post-image-container" style={{ marginTop: '1rem', position: 'relative' }}>
                <div className="post-options-overlay" ref={optionsRef}>
                    <div className="options-trigger" onClick={() => setShowOptions(!showOptions)}>
                        <svg width="28px" height="28px" viewBox="0 0 24 24" fill="none">
                            <circle cx="7" cy="12" r="1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <circle cx="12" cy="12" r="1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <circle cx="17" cy="12" r="1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>

                    {showOptions && (
                        <div className="options-dropdown">
                            {isAuthor ? (
                                <>
                                    <button onClick={() => window.location.href = `/edit/${post.id}`}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                        </svg>
                                        Edit Post
                                    </button>
                                    <button onClick={handleDelete} className="delete">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                        </svg>
                                        Delete Post
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => window.location.href = `/profile/${post.author.id}`}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                            <circle cx="12" cy="7" r="4"></circle>
                                        </svg>
                                        User Info
                                    </button>
                                    <button onClick={handleSave}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                                        </svg>
                                        {saved ? 'Saved' : 'Save Post'}
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {post.image_url ? (
                    <img className="post-image" src={post.image_url} alt={post.title} style={{ width: '100%', borderRadius: '20px', height: '700px', objectFit: 'cover' }} />
                ) : (
                    <div className="post-image" style={{ width: '100%', height: '800px', borderRadius: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--gray-50)', border: '2px dashed var(--gray-200)', color: 'var(--gray-400)' }}>
                        <div style={{ textAlign: 'center' }}>
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="48px" height="48px" style={{ margin: '0 auto 1rem auto' }}>
                               <path d="M4 16L8.58579 11.4142C9.36683 10.6332 10.6332 10.6332 11.4142 11.4142L16 16M14 14L15.5858 12.4142C16.3668 11.6332 17.6332 11.6332 18.4142 12.4142L20 14M14 8H14.01M6 20H18C19.1046 20 20 19.1046 20 18V6C20 4.89543 19.1046 4 18 4H6C4.89543 4 4 4.89543 4 6V18C4 19.1046 4.89543 20 6 20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <p style={{ fontSize: '1.25rem', fontWeight: 500 }}>No photo provided</p>
                        </div>
                    </div>
                )}
            </div>
            <section className="title-interactions">
                <div className="title">
                    <h1 className="smoothie-name">{post.title}</h1>
                    <span className="category">smoothie</span>
                </div>
                <div className="interactions">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--gray-700)' }}>{post.likes_count ?? 0}</span>
                        <svg onClick={handleLike} className="like" width="48px" height="48px" viewBox="0 0 24 24" fill={post.has_liked ? "var(--pink)" : "none"} xmlns="http://www.w3.org/2000/svg" style={{ cursor: 'pointer' }}>
                            <path fillRule="evenodd" clipRule="evenodd" d="M12 6.00019C10.2006 3.90317 7.19377 3.2551 4.93923 5.17534C2.68468 7.09558 2.36727 10.3061 4.13778 12.5772C5.60984 14.4654 10.0648 18.4479 11.5249 19.7369C11.6882 19.8811 11.7699 19.9532 11.8652 19.9815C11.9483 20.0062 12.0393 20.0062 12.1225 19.9815C12.2178 19.9532 12.2994 19.8811 12.4628 19.7369C13.9229 18.4479 18.3778 14.4654 19.8499 12.5772C21.6204 10.3061 21.3417 7.07538 19.0484 5.17534C16.7551 3.2753 13.7994 3.90317 12 6.00019Z" stroke={post.has_liked ? "var(--pink)" : "#364153"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>
                    <svg onClick={handleSave} className={`save ${saved ? 'active' : ''}`} width="48px" height="48px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ cursor: 'pointer' }}>
                        {saved ? (
                            <path d="M6.75 6L7.5 5.25H16.5L17.25 6V19.3162L12 16.2051L6.75 19.3162V6Z" fill="#FBBF24"/>
                        ) : (
                            <path fillRule="evenodd" clipRule="evenodd" d="M6.75 6L7.5 5.25H16.5L17.25 6V19.3162L12 16.2051L6.75 19.3162V6ZM8.25 6.75V16.6838L12 14.4615L15.75 16.6838V6.75H8.25Z" fill="#364153"/>
                        )}
                    </svg>
                    <svg className="share" width="45px" height="45px" viewBox="0 -960 960 960" fill="#364153" strokeWidth="20" stroke="#364153" style={{ cursor: 'pointer', marginLeft: '5px' }}>
                        <path d="M686-80q-47.5 0-80.75-33.25T572-194q0-8 5-34L278-403q-16.28 17.34-37.64 27.17Q219-366 194-366q-47.5 0-80.75-33T80-480q0-48 33.25-81T194-594q24 0 45 9.3 21 9.29 37 25.7l301-173q-2-8-3.5-16.5T572-766q0-47.5 33.25-80.75T686-880q47.5 0 80.75 33.25T800-766q0 47.5-33.25 80.75T686-652q-23.27 0-43.64-9Q622-670 606-685L302-516q3 8 4.5 17.5t1.5 18q0 8.5-1 16t-3 15.5l303 173q16-15 36.09-23.5 20.1-8.5 43.07-8.5Q734-308 767-274.75T800-194q0 47.5-33.25 80.75T686-80Zm.04-60q22.96 0 38.46-15.54 15.5-15.53 15.5-38.5 0-22.96-15.54-38.46-15.53-15.5-38.5-15.5-22.96 0-38.46 15.54-15.5 15.53-15.5 38.5 0 22.96 15.54 38.46 15.53 15.5 38.5 15.5Zm-492-286q22.96 0 38.46-15.54 15.5-15.53 15.5-38.5 0-22.96-15.54-38.46-15.53-15.5-38.5-15.5-22.96 0-38.46 15.54-15.5 15.53-15.5 38.5 0 22.96 15.54 38.46 15.53 15.5 38.5 15.5ZM724.5-727.54q15.5-15.53 15.5-38.5 0-22.96-15.54-38.46-15.53-15.5-38.5-15.5-22.96 0-38.46 15.54-15.5 15.53-15.5 38.5 0 22.96 15.54 38.46 15.53 15.5 38.5 15.5 22.96 0 38.46-15.54ZM686-194ZM194-480Zm492-286Z"/>
                    </svg>
                </div>
            </section>

            <p className="caption">{post.description}</p>
            
            {post.tags && post.tags.length > 0 && (
                <section className="tag-list">
                    {post.tags.map(tag => (
                        <a key={tag.id} href={`/explore?tag=${tag.name}`} className="tag" style={{ textDecoration: 'none' }}>
                            #{tag.name}
                        </a>
                    ))}
                </section>
            )}

            <section className="ingredients-wrapper">
                <div className="ingredients-header">
                    <h3>Ingredients</h3>
                </div>
                <div className="ingredients">
                    {(post.ingredients || []).map((ing, i) => (
                        <div className="ingredient" key={i}>
                            <p className="ingredient-name">{ing.name}</p>
                            <p className="amount">{ing.quantity} {ing.unit === 'piece' ? 'pcs' : ing.unit}</p>
                        </div>
                    ))}
                    {(!post.ingredients || post.ingredients.length === 0) && (
                        <p style={{ color: "var(--gray-500)"}}>None added.</p>
                    )}
                </div>
            </section>

            <section className="instructions-wrapper">
                <div className="instructions-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" height="30px" viewBox="0 -960 960 960" width="30px" fill="#e17100">
                            <path d="M560-564v-68q33-14 67.5-21t72.5-7q26 0 51 4t49 10v64q-24-9-48.5-13.5T700-600q-38 0-73 9.5T560-564Zm0 220v-68q33-14 67.5-21t72.5-7q26 0 51 4t49 10v64q-24-9-48.5-13.5T700-380q-38 0-73 9t-67 27Zm0-110v-68q33-14 67.5-21t72.5-7q26 0 51 4t49 10v64q-24-9-48.5-13.5T700-490q-38 0-73 9.5T560-454ZM260-320q47 0 91.5 10.5T440-278v-394q-41-24-87-36t-93-12q-36 0-71.5 7T120-692v396q35-12 69.5-18t70.5-6Zm260 42q44-21 88.5-31.5T700-320q36 0 70.5 6t69.5 18v-396q-33-14-68.5-21t-71.5-7q-47 0-93 12t-87 36v394Zm-40 118q-48-38-104-59t-116-21q-42 0-82.5 11T100-198q-21 11-40.5-1T40-234v-482q0-11 5.5-21T62-752q46-24 96-36t102-12q58 0 113.5 15T480-740q51-30 106.5-45T700-800q52 0 102 12t96 36q11 5 16.5 15t5.5 21v482q0 23-19.5 35t-40.5 1q-37-20-77.5-31T700-240q-60 0-116 21t-104 59ZM280-494Z"/>
                        </svg>
                        <h3 style={{ margin: 0 }}>Instructions</h3>
                    </div>
                    <button
                        className="cook-with-ai" 
                        onClick={() => setIsCookingMode(true)}
                        style={{
                            background: 'linear-gradient(90deg, #F59E0B, #EA580C)',
                            color: 'white',
                            border: 'none',
                            padding: '0.7rem 1.4rem',
                            borderRadius: '100px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            boxShadow: '0 4px 15px rgba(234, 88, 12, 0.25)',
                            transition: 'transform 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        👨‍🍳 Cook with AI 
                    </button>
                </div>
                <p className="instructions-content" style={{ whiteSpace: 'pre-line' }}>
                    {post.preparation_steps || "Mix and blend to your heart's desire! 🍹"}
                </p>
            </section>

            <div className="line"></div>

            <section className="likes-comments">
                <div className="likes">
                    <span className="number">{post.likes_count}</span>
                    <span className="name">likes</span>
                </div>
                <div className="comments">
                    <span className="number">{post.comments_count}</span>
                    <span className="name">comments</span>
                </div>
            </section>

            <section className="comments-wrapper">
                <h3>Comments</h3>
                <form className="comments" onSubmit={handleCommentSubmit}>
                    <div className="profile-circle">
                        {$user.get()?.avatar ? (
                            <img src={$user.get()?.avatar as string} alt="Me" />
                        ) : (
                            <img src={getDefaultAvatar($user.get()?.id)} alt="Me" />
                        )}
                    </div>
                    <input type="text" className="comment" placeholder="Add a comment" value={commentText} onChange={e => setCommentText(e.target.value)} required />
                    <button type="submit" className="comment-button" disabled={isSubmitting}>
                        <svg width="35px" height="35px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#ffffff">
                            <path d="M10.3009 13.6949L20.102 3.89742M10.5795 14.1355L12.8019 18.5804C13.339 19.6545 13.6075 20.1916 13.9458 20.3356C14.2394 20.4606 14.575 20.4379 14.8492 20.2747C15.1651 20.0866 15.3591 19.5183 15.7472 18.3818L19.9463 6.08434C20.2845 5.09409 20.4535 4.59896 20.3378 4.27142C20.2371 3.98648 20.013 3.76234 19.7281 3.66167C19.4005 3.54595 18.9054 3.71502 17.9151 4.05315L5.61763 8.2523C4.48114 8.64037 3.91289 8.83441 3.72478 9.15032C3.56153 9.42447 3.53891 9.76007 3.66389 10.0536C3.80791 10.3919 4.34498 10.6605 5.41912 11.1975L9.86397 13.42C10.041 13.5085 10.1295 13.5527 10.2061 13.6118C10.2742 13.6643 10.3352 13.7253 10.3876 13.7933C10.4468 13.87 10.491 13.9585 10.5795 14.1355Z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </button>
                </form>

                <div className="comments-section">
                    {(post.comments || []).map(comment => (
                        <div className="public-comment" key={comment.id}>
                            <a href={`/profile/${comment.author.id}`} className="pfp-circle">
                                {comment.author.avatar ? (
                                    <img src={comment.author.avatar} alt={comment.author.name} />
                                ) : (
                                    <img src={getDefaultAvatar(comment.author.id)} alt={comment.author.name} />
                                )}
                            </a>
                            <div className="user-info">
                                <div className="info-head">
                                    <p className="name">{comment.author.name}</p>
                                    <p className="launch-date">{new Date(comment.created_at).toLocaleDateString()}</p>
                                </div>
                                <p className="comment-content">{comment.body}</p>
                            </div>
                        </div>
                    ))}
                    {post.comments && post.comments.length === 0 && (
                        <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>No comments yet. Be the first!</p>
                    )}
                </div>
            </section>

            {isCookingMode && post && (
                <AiCookingAssistant post={post} onClose={() => setIsCookingMode(false)} />
            )}
        </section>
    );
}
