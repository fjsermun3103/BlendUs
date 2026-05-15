import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import type { User, Post } from '../lib/api';
import { $user as $authUser, $isLoggedIn, clearAuth } from '../stores/authStore';
import { getDefaultAvatar } from '../lib/utils';
import { openChat } from '../stores/chatStore';
import './ProfilePage.css';

interface Props {
    userId: number;
}

type ModalType = 'followers' | 'following' | 'edit' | null;

export default function ProfilePage({ userId }: Props) {
    const [user, setUser] = useState<User | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [postsLoading, setPostsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'recipes' | 'saved' | 'liked'>('recipes');
    const [modal, setModal] = useState<ModalType>(null);
    const [modalUsers, setModalUsers] = useState<User[]>([]);
    const [modalLoading, setModalLoading] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);

    // Edit profile form state
    const [editName, setEditName] = useState('');
    const [editUsername, setEditUsername] = useState('');
    const [editBio, setEditBio] = useState('');
    const [editAvatar, setEditAvatar] = useState('');
    const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState('');

    const authUser = $authUser.get();
    const isOwn = authUser?.id === userId;

    useEffect(() => {
        loadUser();
    }, [userId]);

    useEffect(() => {
        loadPosts();
    }, [userId, activeTab]);

    useEffect(() => {
        if (modal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [modal]);

    const loadUser = async () => {
        setLoading(true);
        try {
            const u = await api.getUser(userId);
            setUser(u);
            setIsFollowing(u.is_following ?? false);
            setEditName(u.name ?? '');
            setEditUsername(u.username ?? '');
            setEditBio(u.bio ?? '');
            setEditAvatar(u.avatar ?? '');
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const loadPosts = async () => {
        setPostsLoading(true);
        try {
            let res;
            if (activeTab === 'recipes') {
                res = await api.getUserPosts(userId);
            } else if (activeTab === 'saved') {
                res = await api.getUserSavedPosts(userId);
            } else {
                res = await api.getUserLikedPosts(userId);
            }
            setPosts(res.data);
        } catch {
            setPosts([]);
        } finally {
            setPostsLoading(false);
        }
    };

    const handleFollowFromModal = async (targetUser: User) => {
        if (!$isLoggedIn.get()) { window.location.href = '/login'; return; }
        try {
            if (targetUser.is_following) {
                await api.unfollowUser(targetUser.id);
                setModalUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, is_following: false } : u));
                if (isOwn) {
                    setUser(prev => prev ? { ...prev, following_count: (prev.following_count ?? 1) - 1 } : prev);
                }
            } else {
                await api.followUser(targetUser.id);
                setModalUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, is_following: true } : u));
                if (isOwn) {
                    setUser(prev => prev ? { ...prev, following_count: (prev.following_count ?? 0) + 1 } : prev);
                }
            }
        } catch (err) {
            console.error('Modal follow failed', err);
        }
    };

    const openModal = async (type: 'followers' | 'following') => {
        setModal(type);
        setModalLoading(true);
        try {
            const list = type === 'followers'
                ? await api.getFollowers(userId)
                : await api.getFollowing(userId);
            setModalUsers(list);
        } catch {
            setModalUsers([]);
        } finally {
            setModalLoading(false);
        }
    };

    const handleFollow = async () => {
        if (!$isLoggedIn.get()) { window.location.href = '/login'; return; }
        setFollowLoading(true);
        try {
            if (isFollowing) {
                await api.unfollowUser(userId);
                setIsFollowing(false);
                setUser(prev => prev ? { ...prev, followers_count: (prev.followers_count ?? 1) - 1 } : prev);
            } else {
                await api.followUser(userId);
                setIsFollowing(true);
                setUser(prev => prev ? { ...prev, followers_count: (prev.followers_count ?? 0) + 1 } : prev);
            }
        } catch {
        } finally {
            setFollowLoading(false);
        }
    };

    const handleEditSave = async () => {
        if (!user) return;
        setEditLoading(true);
        setEditError('');
        try {
            const updated = await api.updateUser(userId, {
                name: editName,
                username: editUsername,
                bio: editBio,
                avatar: editAvatarFile ? undefined : editAvatar, // Use editAvatar ('' if removed) if no file is selected
                avatar_file: editAvatarFile || undefined,
            });
            // Merge to preserve counts (followers_count, following_count, posts_count)
            // that the update endpoint may not return
            setUser(prev => prev ? { ...prev, ...updated } : updated);
            setModal(null);
            setEditAvatarFile(null);
            // Sync local auth store if editing own profile
            if (isOwn) {
                // We keep the current token
                const token = localStorage.getItem('blendus_token');
                if (token) {
                    import('../stores/authStore').then(({ setAuth }) => {
                        setAuth(token, updated);
                    });
                }
            }
        } catch (err: any) {
            setEditError(err.message ?? 'Failed to save changes.');
        } finally {
            setEditLoading(false);
        }
    };

    if (loading) return (
        <div className="profile-loading">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#e17100" strokeWidth="2" strokeDasharray="50" strokeDashoffset="20">
                    <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
                </circle>
            </svg>
        </div>
    );

    if (!user) return (
        <div className="empty-state">
            <p>User not found 🍹</p>
            <button onClick={() => window.history.back()} className="btn" style={{ display: 'inline-block', marginTop: '1rem', border: 'none', cursor: 'pointer' }}>Back to safety</button>
        </div>
    );

    const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

    return (
        <div className="profile">
            <div className="user-container">
                <div className="user-header">
                    <div className="pfp-circle">
                        <div className="user-pic">
                            {user.avatar ? (
                                <img src={user.avatar} alt={user.name} />
                            ) : user.avatar === '' ? (
                                <img src="/assets/avatars/no-user-pfp.svg" alt="No profile" style={{ padding: '20%' }} />
                            ) : (
                                <img src={getDefaultAvatar(user.id)} alt={user.name} />
                            )}
                        </div>
                    </div>
                    <div className="user-info">
                        <h3 className="username">@{user.username}</h3>
                        {user.email && <p className="email">{user.email}</p>}
                        
                    </div>
                </div>
                <div className="bio">
                    <p className="full-name">{user.name}</p>
                    {user.bio && <p className="description">{user.bio}</p>}
                </div>
                <div className="user-stats">
                    <div className="stat">
                        <span className="stat-number">{user.posts_count ?? posts.length}</span>
                        <span className="stat-label">posts</span>
                    </div>
                    <div className="stat" onClick={() => openModal('followers')} style={{ cursor: 'pointer' }}>
                        <span className="stat-number">{user.followers_count ?? 0}</span>
                        <span className="stat-label">followers</span>
                    </div>
                    <div className="stat" onClick={() => openModal('following')} style={{ cursor: 'pointer' }}>
                        <span className="stat-number">{user.following_count ?? 0}</span>
                        <span className="stat-label">following</span>
                    </div>
                </div>

                
                <div className="user-buttons">
                    {isOwn ? (
                        <button className="btn btn-primary" onClick={() => setModal('edit')}>Edit Profile</button>
                    ) : (
                        <>
                            <button
                                className={isFollowing ? 'btn-notfollow' : 'btn-primary'}
                                onClick={handleFollow}
                                disabled={followLoading}
                            >
                                {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
                            </button>
                            <button className="btn-message" onClick={async () => {
                                try {
                                    const res = await api.createConversation([user.id]);
                                    openChat({
                                        id: res.id,
                                        name: user.name,
                                        avatar_url: user.avatar || getDefaultAvatar(user.id),
                                        is_group: false,
                                        last_message: "",
                                        unread_count: 0,
                                        other_user_id: user.id
                                    });
                                } catch (err) {
                                    console.error("Could not start conversation", err);
                                }
                            }}>
                                Message
                            </button>
                        </>
                    )}
                    {isOwn && (
                        <button 
                            className="btn-logout" 
                            onClick={async () => {
                                try { await api.logout(); } catch {}
                                clearAuth();
                                window.location.href = '/login';
                            }}
                        >
                            Logout
                        </button>
                    )}
                    <button className="btn-share" onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        alert('Profile link copied!');
                    }}><svg xmlns="http://www.w3.org/2000/svg" height="48px" viewBox="0 -960 960 960" width="48px" fill="#6B7282">
                        <path d="M686-80q-47.5 0-80.75-33.25T572-194q0-8 5-34L278-403q-16.28 17.34-37.64 27.17Q219-366 194-366q-47.5 0-80.75-33T80-480q0-48 33.25-81T194-594q24 0 45 9.3 21 9.29 37 25.7l301-173q-2-8-3.5-16.5T572-766q0-47.5 33.25-80.75T686-880q47.5 0 80.75 33.25T800-766q0 47.5-33.25 80.75T686-652q-23.27 0-43.64-9Q622-670 606-685L302-516q3 8 4.5 17.5t1.5 18q0 8.5-1 16t-3 15.5l303 173q16-15 36.09-23.5 20.1-8.5 43.07-8.5Q734-308 767-274.75T800-194q0 47.5-33.25 80.75T686-80Zm.04-60q22.96 0 38.46-15.54 15.5-15.53 15.5-38.5 0-22.96-15.54-38.46-15.53-15.5-38.5-15.5-22.96 0-38.46 15.54-15.5 15.53-15.5 38.5 0 22.96 15.54 38.46 15.53 15.5 38.5 15.5Zm-492-286q22.96 0 38.46-15.54 15.5-15.53 15.5-38.5 0-22.96-15.54-38.46-15.53-15.5-38.5-15.5-22.96 0-38.46 15.54-15.5 15.53-15.5 38.5 0 22.96 15.54 38.46 15.53 15.5 38.5 15.5ZM724.5-727.54q15.5-15.53 15.5-38.5 0-22.96-15.54-38.46-15.53-15.5-38.5-15.5-22.96 0-38.46 15.54-15.5 15.53-15.5 38.5 0 22.96 15.54 38.46 15.53 15.5 38.5 15.5 22.96 0 38.46-15.54ZM686-194ZM194-480Zm492-286Z"/></svg>
                    </button>
                </div>
            </div>

            <div className="tabs">
                <button
                    type="button"
                    className={`tab ${activeTab === 'recipes' ? 'active' : ''}`}
                    onClick={() => setActiveTab('recipes')}
                >
                    <svg height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
                        <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h133v-133H200v133Zm213 0h134v-133H413v133Zm214 0h133v-133H627v133ZM200-413h133v-134H200v134Zm213 0h134v-134H413v134Zm214 0h133v-134H627v134ZM200-627h133v-133H200v133Zm213 0h134v-133H413v133Zm214 0h133v-133H627v133Z" />
                    </svg>
                    <span className="tab-name">Posts</span>
                </button>

                {isOwn && (
                    <button
                        type="button"
                        className={`tab ${activeTab === 'saved' ? 'active' : ''}`}
                        onClick={() => setActiveTab('saved')}
                    >
                        <svg height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
                            <path d="M200-120v-640q0-33 23.5-56.5T280-840h400q33 0 56.5 23.5T760-760v640L480-240 200-120Zm80-122 200-86 200 86v-518H280v518Zm0-518h400-400Z" />
                        </svg>
                        <span className="tab-name">Saved</span>
                    </button>
                )}

                <button
                    type="button"
                    className={`tab ${activeTab === 'liked' ? 'active' : ''}`}
                    onClick={() => setActiveTab('liked')}
                >
                    <svg viewBox="0 0 24 24" width="24px" height="24px" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" clipRule="evenodd" d="M12 6.00019C10.2006 3.90317 7.19377 3.2551 4.93923 5.17534C2.68468 7.09558 2.36727 10.3061 4.13778 12.5772C5.60984 14.4654 10.0648 18.4479 11.5249 19.7369C11.6882 19.8811 11.7699 19.9532 11.8652 19.9815C11.9483 20.0062 12.0393 20.0062 12.1225 19.9815C12.2178 19.9532 12.2994 19.8811 12.4628 19.7369C13.9229 18.4479 18.3778 14.4654 19.8499 12.5772C21.6204 10.3061 21.3417 7.07538 19.0484 5.17534C16.7551 3.2753 13.7994 3.90317 12 6.00019Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="tab-name">Liked</span>
                </button>
            </div>

            {/* ── POSTS GRID ── */}
            <div className={`user-grid ${!postsLoading && posts.length === 0 ? 'ghost' : ''}`}>
                {postsLoading ? (
                    <div className="profile-loading">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                            <circle
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="#e17100"
                                strokeWidth="2"
                                strokeDasharray="50"
                                strokeDashoffset="20"
                            >
                                <animateTransform
                                    attributeName="transform"
                                    type="rotate"
                                    from="0 12 12"
                                    to="360 12 12"
                                    dur="1s"
                                    repeatCount="indefinite"
                                />
                            </circle>
                        </svg>
                    </div>
                ) : posts.length === 0 ? (
                    [...Array(9)].map((_, i) => (
                        <div key={i} className="grid skeleton">
                            {i === 4 && (
                                <div className="empty-message">
                                    <p>
                                        {activeTab === 'recipes'
                                            ? 'No recipes shared yet.'
                                            : activeTab === 'saved'
                                                ? 'No saved posts.'
                                                : 'No liked posts.'}
                                    </p>

                                    {isOwn && activeTab === 'recipes' && (
                                        <a href="/create" className="btn-profile-promo">
                                            Share First Recipe
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    posts.map(post => (
                        <a href={`/post/${post.id}`} key={post.id} className="grid">
                            {post.image_url ? (
                                <img src={post.image_url} alt={post.title} />
                            ) : (
                                <div className="post-placeholder">🍹</div>
                            )}


                            <div className="overlay">
                                <h4 className="title">{post.title}</h4>

                                <div className="likes-comments">
                                    <span className="likes">{post.likes_count} ❤️</span>
                                    <div className="comments">{post.comments_count} 💬</div>
                                </div>
                            </div>
                        </a>
                    ))
                )}
            </div>

            {/* ── FOLLOWERS / FOLLOWING MODAL ── */}
            {(modal === 'followers' || modal === 'following') && (
                <div className="modal-overlay" onClick={() => setModal(null)}>
                    <div className="modal-card" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{modal === 'followers' ? 'Followers' : 'Following'}</h3>
                            <button className="modal-close" onClick={() => setModal(null)}>✕</button>
                        </div>
                        <div className="modal-body">
                            {modalLoading ? (
                                <p className="modal-hint">Loading...</p>
                            ) : modalUsers.length === 0 ? (
                                <p className="modal-hint">No users yet.</p>
                            ) : (
                                modalUsers.map(u => {
                                    const ini = u.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                                    const isMe = u.id === authUser?.id;
                                    return (
                                        <div key={u.id} className="modal-user-row">
                                            <a href={`/profile/${u.id}`} className="modal-user-link" onClick={() => setModal(null)}>
                                                <div className="pfp-circle" style={{ width: 44, height: 44 }}>
                                                    {u.avatar ? (
                                                        <img src={u.avatar} alt={u.name} />
                                                    ) : (
                                                        <img src={getDefaultAvatar(u.id)} alt={u.name} />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="modal-user-name">{u.name}</p>
                                                    <p className="modal-user-username">@{u.username}</p>
                                                </div>
                                            </a>

                                            {/* Show Follow/Unfollow only on OWN profile following list */}
                                            {isOwn && modal === 'following' && !isMe && (
                                                <button
                                                    className="modal-btn-action"
                                                    onClick={() => handleFollowFromModal(u)}
                                                >
                                                    {u.is_following ? 'Unfollow' : 'Follow'}
                                                </button>
                                            )}

                                            {/* Show View button in all other cases (followers list, or someone else's following list) */}
                                            {((!isOwn && (modal === 'followers' || modal === 'following')) || (isOwn && modal === 'followers')) && (
                                                <a
                                                    href={`/profile/${u.id}`}
                                                    className="modal-btn-action"
                                                    onClick={() => setModal(null)}
                                                >
                                                    View
                                                </a>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── EDIT PROFILE MODAL ── */}
            {modal === 'edit' && (
                <div className="modal-overlay" onClick={() => setModal(null)}>
                    <div className="modal-card modal-edit" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Edit Profile</h3>
                            <button className="modal-close" onClick={() => setModal(null)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="edit-field">
                                <label>Name</label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    placeholder="Your full name"
                                />
                            </div>
                            <div className="edit-field">
                                <label>Username</label>
                                <input
                                    type="text"
                                    value={editUsername}
                                    onChange={e => setEditUsername(e.target.value)}
                                    placeholder="@username"
                                />
                            </div>
                            <div className="edit-field">
                                <label>Bio</label>
                                <textarea
                                    value={editBio}
                                    onChange={e => setEditBio(e.target.value)}
                                    placeholder="Tell the community about yourself..."
                                    rows={3}
                                />
                            </div>
                             <div className="edit-field">
                                <label>Or Upload Photo</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={e => {
                                        setEditAvatarFile(e.target.files?.[0] || null);
                                        setEditAvatar(''); // Clear URL if file is chosen
                                    }}
                                    style={{ padding: '0.5rem 0' }}
                                />
                            </div>
                            
                            {editError && <p className="edit-error">{editError}</p>}
                            <button className="btn edit-save-btn" onClick={handleEditSave} disabled={editLoading}>
                                {editLoading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
