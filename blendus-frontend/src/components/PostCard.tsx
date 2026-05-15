import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import type { Post, PostComment } from '../lib/api';
import { $isLoggedIn, $user } from '../stores/authStore';
import { getDefaultAvatar, getInitials } from '../lib/utils';
import './PostCard.css';

interface Props {
    post: Post;
    onLikeToggle?: (postId: number, liked: boolean, count: number) => void;
    showComments?: boolean;
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function PostCard({ post, onLikeToggle, showComments = false }: Props) {
    const [liked, setLiked] = useState(post.has_liked ?? false);
    const [likesCount, setLikesCount] = useState(post.likes_count ?? 0);
    const [commentsCount, setCommentsCount] = useState(post.comments_count ?? 0);
    const [comment, setComment] = useState('');
    const [comments, setComments] = useState<PostComment[]>(post.comments ?? []);
    const [commentsOpen, setCommentsOpen] = useState(showComments);
    const [submitting, setSubmitting] = useState(false);
    const [saved, setSaved] = useState(post.has_saved ?? false);
    const [expanded, setExpanded] = useState(false);
    const [fetchedComments, setFetchedComments] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
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
        if (commentsOpen && !fetchedComments && comments.length === 0 && post.comments_count > 0) {
            api.getComments(post.id)
                .then(res => {
                    const sorted = res.sort((a: any, b: any) =>
                        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                    );
                    setComments(sorted.slice(-4)); // only keep the 4 most recent
                    setFetchedComments(true);
                })
                .catch(console.error);
        }
    }, [commentsOpen, fetchedComments, comments.length, post.comments_count, post.id]);

    const handleLike = async () => {
        if (!$isLoggedIn.get()) { window.location.href = '/login'; return; }
        try {
            const res = await api.likePost(post.id);
            setLiked(res.liked);
            setLikesCount(res.count);
            onLikeToggle?.(post.id, res.liked, res.count);
        } catch { }
    };

    const handleComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!comment.trim()) return;
        if (!$isLoggedIn.get()) { window.location.href = '/login'; return; }
        setSubmitting(true);
        try {
            const newComment = await api.createComment(post.id, comment);
            setComments((prev: PostComment[]) => [...prev, newComment]);
            setCommentsCount(prev => prev + 1);
            setComment('');
        } catch { } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this smoothie? 🥤🗑️')) return;
        try {
            await api.deletePost(post.id);
            window.location.reload(); // Quick refresh to update feed
        } catch (err) {
            alert('Failed to delete post');
        }
    };

    const handleToggleSave = async () => {
        if (!$isLoggedIn.get()) { window.location.href = '/login'; return; }
        const prev = saved;
        setSaved(!prev);
        try {
            await api.toggleSavePost(post.id);
        } catch {
            setSaved(prev);
        }
    };

    const isAuthor = $user.get()?.id === post.author?.id;

    // Nico's API v2: image_url is a direct string, author is the user
    const imageUrl = post.image_url || '/assets/smoothie2.webp';
    const authorName = post.author?.name ?? 'Unknown';
    const initials = authorName.split(' ').map(n => n[0]).join('').slice(0, 2);

    return (
        <section className="post">
            <div className="post-header">
                <a href={`/profile/${post.author?.id}`} className="post-user" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="pfp-circle">
                        {post.author?.avatar ? (
                            <img src={post.author.avatar} alt={authorName} loading="lazy" decoding="async" />
                        ) : (
                            <img src={getDefaultAvatar(post.author?.id)} alt={authorName} loading="lazy" decoding="async" />
                        )}
                    </div>
                    <div className="user-info">
                        <p className="name">{authorName}</p>
                        <p className="launch-date">{formatDate(post.created_at)}</p>
                    </div>
                </a>

                <div className="post-options" ref={optionsRef} onClick={() => setShowOptions(!showOptions)} style={{ position: 'relative' }}>
                    <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none">
                        <circle cx="7" cy="12" r="1.5" stroke="#99A1AF" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="12" cy="12" r="1.5" stroke="#99A1AF" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="17" cy="12" r="1.5" stroke="#99A1AF" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>

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
                                    <button onClick={handleToggleSave}>
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
            </div>

            {post.image_url ? (
                <a href={`/post/${post.id}`} style={{ display: 'block', textDecoration: 'none' }}>
                    <div className="post-image" style={{ backgroundImage: `url(${post.image_url})`, borderRadius: '12px', marginTop: '1rem' }} />
                </a>
            ) : (
                <a href={`/post/${post.id}`} style={{ display: 'block', textDecoration: 'none' }}>
                    <div className="post-placeholder" style={{ borderRadius: '12px', marginTop: '1rem' }}>🍹</div>
                </a>
            )}


            <div className="interactions">
                <div className="like-comment-share">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }} onClick={handleLike}>
                        <svg className="like" width="24px" height="24px" viewBox="0 0 24 24" fill="none">
                            {liked ? (
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#FF2056" />
                            ) : (
                                <path d="M12.1 18.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z" fill="none" stroke="#364153" strokeWidth="2"/>
                            )}
                        </svg>
                        <span style={{ fontSize: '0.88rem', color: '#666' }}>{likesCount}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }} onClick={() => setCommentsOpen(o => !o)}>
                        <svg className="comment" width="24px" height="24px" viewBox="0 0 32 32" fill="none">
                            <path d="M16 4C9.373 4 4 8.373 4 14c0 3.314 1.657 6.248 4.224 8.12L8 28l6.4-3.2c.53.08 1.06.12 1.6.12 6.627 0 12-4.373 12-10S22.627 4 16 4z"
                                stroke="#364153" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span style={{ fontSize: '0.88rem', color: '#666' }}>{commentsCount}</span>
                    </div>

                    <div style={{ cursor: 'pointer' }} onClick={() => navigator.clipboard?.writeText(window.location.origin)}>
                        <svg className="share" width="24px" height="24px" xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="#364153">
                            <path d="M686-80q-47.5 0-80.75-33.25T572-194q0-8 5-34L278-403q-16.28 17.34-37.64 27.17Q219-366 194-366q-47.5 0-80.75-33T80-480q0-48 33.25-81T194-594q24 0 45 9.3 21 9.29 37 25.7l301-173q-2-8-3.5-16.5T572-766q0-47.5 33.25-80.75T686-880q47.5 0 80.75 33.25T800-766q0 47.5-33.25 80.75T686-652q-23.27 0-43.64-9Q622-670 606-685L302-516q3 8 4.5 17.5t1.5 18q0 8.5-1 16t-3 15.5l303 173q16-15 36.09-23.5 20.1-8.5 43.07-8.5Q734-308 767-274.75T800-194q0 47.5-33.25 80.75T686-80Z"/>
                        </svg>
                    </div>
                </div>

                <div className="save" style={{ cursor: 'pointer' }} onClick={handleToggleSave}>
                    <svg className={`save-icon ${saved ? 'active' : ''}`} width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {saved ? (
                            <path d="M6.75 6L7.5 5.25H16.5L17.25 6V19.3162L12 16.2051L6.75 19.3162V6Z" fill="#FBBF24"/>
                        ) : (
                            <path fillRule="evenodd" clipRule="evenodd" d="M6.75 6L7.5 5.25H16.5L17.25 6V19.3162L12 16.2051L6.75 19.3162V6ZM8.25 6.75V16.6838L12 14.4615L15.75 16.6838V6.75H8.25Z" fill="#364153"/>
                        )}
                    </svg>
                </div>
            </div>

            <div className="description">
                <p>
                    <span className="name" style={{ marginRight: 5 }}>{authorName}</span>
                    {expanded || post.description.length <= 100
                        ? post.description
                        : post.description.substring(0, 100) + '...'}
                    {post.description.length > 100 && !expanded && (
                        <span onClick={() => setExpanded(true)} style={{ cursor: 'pointer', color: '#007A55', marginLeft: 4 }}>more</span>
                    )}
                </p>
            </div>

            {post.tags.length > 0 && (
                <div className="hashtags">
                    {post.tags.map(tag => (
                        <span key={tag.id} className="hashtag">#{tag.name}</span>
                    ))}
                </div>
            )}

            {commentsOpen && (
                <div style={{ marginTop: '1rem', borderTop: '1px solid #eee', paddingTop: '1rem', padding: '1rem 1rem 1rem' }}>
                    {comments.slice(-4).map(c => (
                        <div key={c.id} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                            <a href={`/profile/${c.author?.id}`} className="pfp-circle" style={{ width: 28, height: 28 }}>
                                {c.author?.avatar ? (
                                    <img src={c.author.avatar} alt={c.author?.name} loading="lazy" decoding="async" />
                                ) : (
                                    <img src={getDefaultAvatar(c.author?.id)} alt={c.author?.name} loading="lazy" decoding="async" />
                                )}
                            </a>
                            <div>
                                <strong style={{ fontSize: '0.88rem' }}>{c.author?.name}</strong>
                                <span style={{ fontSize: '0.88rem', color: '#666', marginLeft: 6 }}>{c.body}</span>
                            </div>
                        </div>
                    ))}
                    <form onSubmit={handleComment} style={{ display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'center' }}>
                        <div className="pfp-circle" style={{ width: 30, height: 30 }}>
                            {$user.get()?.avatar ? (
                                <img src={$user.get()?.avatar as string} alt="Me" />
                            ) : (
                                <img src={getDefaultAvatar($user.get()?.id)} alt="Me" />
                            )}
                        </div>
                        <input
                            style={{ flex: 1, padding: '8px 12px', border: '1px solid #ddd', borderRadius: '15px', outline: 'none' }}
                            placeholder="Add a comment..."
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                            disabled={submitting}
                        />
                        <button type="submit" disabled={submitting || !comment.trim()}
                            style={{ background: 'none', border: 'none', color: 'var(--amber-600)', fontWeight: 'bold', cursor: 'pointer' }}>
                            Post
                        </button>
                    </form>
                </div>
            )}
        </section>
    );
}
