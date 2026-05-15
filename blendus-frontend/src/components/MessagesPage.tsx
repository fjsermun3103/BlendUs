import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { openChat, activeChat, type ChatData } from '../stores/chatStore';
import { useStore } from '@nanostores/react';
import './MessagesPage.css';
import { $user as $authUser } from '../stores/authStore';
import { getDefaultAvatar } from '../lib/utils';

export default function MessagesPage() {
    const [chats, setChats] = useState<ChatData[]>([]);
    const [loading, setLoading] = useState(true);
    const $activeChat = useStore(activeChat);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isOptionsOpen, setIsOptionsOpen] = useState(false);
    const optionsRef = useRef<HTMLDivElement>(null);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Group Creation State
    const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);

    // DM Selection State
    const [isNewDmOpen, setIsNewDmOpen] = useState(false);
    const [isCreatingDm, setIsCreatingDm] = useState(false);
    const [userSearchTerm, setUserSearchTerm] = useState('');

    const fetchChats = async () => {
        try {
            const res = await api.getConversations();
            const authUser = $authUser.get();

            const mappedChats = res.map((conv: any) => {
                const isGroup = conv.type === 'group';
                let name = conv.name || 'Conversation';
                let avatar = isGroup ? '/assets/avatars/group-avatar.svg' : (conv.avatar || '/assets/avatars/no-user-pfp.svg');
                let otherUserId = undefined;

                if (!isGroup && conv.participants) {
                    const otherUser = conv.participants.find((p: any) => p.id !== authUser?.id);
                    if (otherUser) {
                        name = otherUser.name;
                        avatar = otherUser.avatar || getDefaultAvatar(otherUser.id);
                        otherUserId = otherUser.id;
                    }
                }

                return {
                    id: conv.id,
                    name: name,
                    avatar_url: avatar,
                    is_group: isGroup,
                    last_message: conv.last_message?.body || '',
                    unread_count: conv.unread_count || 0,
                    other_user_id: otherUserId,
                    owner_id: conv.owner_id,
                    last_activity: conv.last_message?.created_at || conv.created_at
                };
            });

            // Sort by latest message/creation
            mappedChats.sort((a: any, b: any) =>
                new Date(b.last_activity || 0).getTime() - new Date(a.last_activity || 0).getTime()
            );

            setChats(mappedChats);
        } catch (err) {
            console.error("Failed to load chats", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if ($authUser.get()) {
            fetchChats();
        }

        // Poll chat list every 10 seconds for new messages/chats
        const interval = setInterval(() => {
            if ($authUser.get()) fetchChats();
        }, 10000);

        return () => clearInterval(interval);
    }, []);

    const fetchMessages = async (chatId: number) => {
        try {
            const msgs = await api.getMessages(chatId);
            const authUser = $authUser.get();
            setMessages(msgs.reverse().map((m: any) => ({
                id: m.id,
                sender: m.sender?.id === authUser?.id ? 'me' : 'them',
                text: m.body,
                senderName: m.sender?.name
            })));
        } catch (err) {
            console.error("Failed to fetch messages", err);
        }
    };

    useEffect(() => {
        if ($activeChat) {
            fetchMessages($activeChat.id);

            // Poll messages every 5 seconds when active
            const interval = setInterval(() => {
                fetchMessages($activeChat.id);
            }, 5000);

            return () => clearInterval(interval);
        }
    }, [$activeChat]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !$activeChat || sending) return;

        setSending(true);
        try {
            await api.sendMessage($activeChat.id, newMessage);
            setNewMessage('');
            await fetchMessages($activeChat.id);
            await fetchChats();
        } catch (err) {
            console.error("Failed to send message", err);
        } finally {
            setSending(false);
        }
    };


    const handleDeleteChat = async () => {
        if (!$activeChat) return;

        const authUser = $authUser.get();
        const isOwner = $activeChat.is_group && authUser && $activeChat.owner_id === authUser.id;

        let confirmMsg = "¿Estás seguro de que quieres eliminar este chat?";
        if ($activeChat.is_group) {
            confirmMsg = isOwner
                ? "¿Estás seguro de que quieres ELIMINAR este grupo? Se borrará para todos."
                : "¿Estás seguro de que quieres SALIR de este grupo?";
        }

        if (!window.confirm(confirmMsg)) return;

        try {
            await api.deleteConversation($activeChat.id);
            openChat(null);
            setIsOptionsOpen(false);
            fetchChats();
        } catch (err) {
            console.error("Failed to delete chat", err);
            alert("Hubo un error al procesar tu solicitud.");
        }
    };

    const handleCreateGroup = async () => {
        if (!groupName.trim() || selectedUserIds.length === 0 || isCreatingGroup) return;

        setIsCreatingGroup(true);
        try {
            const newChat = await api.createConversation(selectedUserIds, groupName, true);
            setIsCreateGroupOpen(false);
            setGroupName('');
            setSelectedUserIds([]);
            fetchChats();
            openChat({
                id: newChat.id,
                name: newChat.name || groupName,
                avatar_url: '/assets/avatars/group-avatar.svg',
                is_group: true,
                last_message: '',
                unread_count: 0
            });
        } catch (err) {
            console.error("Failed to create group", err);
        } finally {
            setIsCreatingGroup(false);
        }
    };

    const toggleUserSelection = (id: number) => {
        setSelectedUserIds(prev =>
            prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
        );
    };

    const fetchAllUsers = async () => {
        try {
            const users = await api.getUsers();
            const authUser = $authUser.get();
            setAllUsers(users.filter((u: any) => u.id !== authUser?.id));
        } catch (err) {
            console.error("Failed to fetch users", err);
        }
    };

    const handleCreateDm = async (userId: number) => {
        if (isCreatingDm) return;
        setIsCreatingDm(true);
        try {
            const newChat = await api.createConversation([userId], undefined, false);
            setIsNewDmOpen(false);
            fetchChats();

            const authUser = $authUser.get();
            const otherUser = allUsers.find(u => u.id === userId);

            openChat({
                id: newChat.id,
                name: otherUser?.name || 'Conversation',
                avatar_url: otherUser?.avatar || getDefaultAvatar(userId),
                is_group: false,
                last_message: '',
                unread_count: 0,
                other_user_id: userId
            });
        } catch (err) {
            console.error("Failed to start DM", err);
        } finally {
            setIsCreatingDm(false);
        }
    };

    useEffect(() => {
        if (isCreateGroupOpen || isNewDmOpen) {
            fetchAllUsers();
        }
    }, [isCreateGroupOpen, isNewDmOpen]);

    const filteredUsers = allUsers.filter(u =>
        u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        u.username.toLowerCase().includes(userSearchTerm.toLowerCase())
    );

    return (
        <div className={`messages-layout ${$activeChat ? 'chat-active' : ''}`}>
            {/* Sidebar */}
            <div className="messages-sidebar">
                <div className="sidebar-header">
                    <h2>Messages</h2>
                    <div className="header-actions">
                        <button
                            className="header-action-btn"
                            title="New Message"
                            onClick={() => setIsNewDmOpen(true)}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                            </svg>
                        </button>
                        <button
                            className="header-action-btn"
                            title="Create Group"
                            onClick={() => setIsCreateGroupOpen(true)}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                <div className="chat-list-full">
                    {loading ? (
                        <div className="loading-state">Loading chats...</div>
                    ) : chats.length === 0 ? (
                        <div className="empty-state">No conversations yet</div>
                    ) : (
                        chats.map(chat => (
                            <div
                                key={chat.id}
                                className={`chat-item ${$activeChat?.id === chat.id ? 'active' : ''}`}
                                onClick={() => openChat(chat)}
                            >
                                <div className="circle">
                                    <img src={chat.avatar_url} alt={chat.name} className="chat-item-avatar" />
                                </div>
                                <div className="chat-item-info">
                                    <div className="chat-item-name">
                                        {chat.name}
                                        {chat.is_group && <span className="group-tag">GP</span>}
                                    </div>
                                    <div className="chat-item-preview">{chat.last_message}</div>
                                </div>
                                {chat.unread_count > 0 && <div className="unread-dot">{chat.unread_count}</div>}
                            </div>
                        ))
                    )}
                </div>

            </div>

            {/* Chat Area */}
            <div className="messages-content">
                {$activeChat ? (
                    <>
                        <div className="chat-header">
                            <button 
                                className="mobile-back-btn" 
                                onClick={() => openChat(null)}
                                title="Back to chats"
                            >
                                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>
                            <a
                                href={$activeChat.is_group ? '#' : `/profile/${$activeChat.other_user_id}`}
                                className="header-user-info"
                                style={{ display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none', color: 'inherit' }}
                            >
                                <div className="circle">
                                    <img src={$activeChat.avatar_url} alt={$activeChat.name} />

                                </div>
                                <div>
                                    <h3>{$activeChat.name}</h3>
                                    <span>{$activeChat.is_group ? 'Group Chat' : 'Direct Message'}</span>
                                </div>
                            </a>

                            <div className="header-options-wrapper" ref={optionsRef}>
                                <button
                                    className="options-btn"
                                    onClick={() => setIsOptionsOpen(!isOptionsOpen)}
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="7" r="1.5" fill="currentColor" />
                                        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                                        <circle cx="12" cy="17" r="1.5" fill="currentColor" />
                                    </svg>
                                </button>

                                {isOptionsOpen && (
                                    <div className="options-dropdown">
                                        {!$activeChat.is_group && (
                                            <a href={`/profile/${$activeChat.other_user_id}`} className="dropdown-item">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                                                </svg>
                                                View Profile
                                            </a>
                                        )}
                                        <button className="dropdown-item delete" onClick={handleDeleteChat}>
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                            </svg>
                                            {$activeChat.is_group
                                                ? ($authUser.get()?.id === $activeChat.owner_id ? 'Delete Group' : 'Exit Group')
                                                : 'Delete Chat'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="messages-container">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`msg-row ${msg.sender}`}>
                                    {msg.sender === 'them' && msg.senderName && (
                                        <span className="sender-name">{msg.senderName}</span>
                                    )}
                                    <div className="msg-bubble">
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                        <form className="chat-input-area" onSubmit={handleSendMessage}>
                            <input
                                type="text"
                                placeholder="Write a message..."
                                value={newMessage}
                                onChange={e => setNewMessage(e.target.value)}
                            />
                            <button type="submit" disabled={sending}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="no-chat-selected">
                        <div className="illustration">💬</div>
                        <h3>Your Messages</h3>
                        <p>Select a conversation or start a new one to begin chatting.</p>
                    </div>
                )}
            </div>

            {/* Create Group Modal */}
            {isCreateGroupOpen && (
                <div className="modal-overlay" onClick={() => setIsCreateGroupOpen(false)}>
                    <div className="group-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Create New Group</h3>
                            <button onClick={() => setIsCreateGroupOpen(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <input
                                type="text"
                                placeholder="Group Name"
                                className="group-name-input"
                                value={groupName}
                                onChange={e => setGroupName(e.target.value)}
                            />
                            <div className="modal-search-wrapper">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="search-icon">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <path d="M21 21l-4.35-4.35"></path>
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search by name or username..."
                                    className="modal-search-input"
                                    value={userSearchTerm}
                                    onChange={e => setUserSearchTerm(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <p className="selection-label">Select Participants:</p>
                            <div className="user-selection-list">
                                {filteredUsers.map(u => (
                                    <div
                                        key={u.id}
                                        className={`user-selection-item ${selectedUserIds.includes(u.id) ? 'selected' : ''}`}
                                        onClick={() => toggleUserSelection(u.id)}
                                    >
                                        <img src={u.avatar || getDefaultAvatar(u.id)} alt={u.name} />
                                        <span>{u.name}</span>
                                        <div className="checkbox">
                                            {selectedUserIds.includes(u.id) && '✓'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="cancel-btn" onClick={() => setIsCreateGroupOpen(false)}>Cancel</button>
                            <button
                                className="confirm-btn"
                                disabled={!groupName.trim() || selectedUserIds.length === 0 || isCreatingGroup}
                                onClick={handleCreateGroup}
                            >
                                {isCreatingGroup ? 'Creating...' : 'Create Group'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* New DM Modal */}
            {isNewDmOpen && (
                <div className="modal-overlay" onClick={() => setIsNewDmOpen(false)}>
                    <div className="group-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>New Message</h3>
                            <button onClick={() => setIsNewDmOpen(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="modal-search-wrapper">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="search-icon">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <path d="M21 21l-4.35-4.35"></path>
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search by name or username..."
                                    className="modal-search-input"
                                    value={userSearchTerm}
                                    onChange={e => setUserSearchTerm(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <p className="selection-label">Select a user to chat with:</p>
                            <div className="user-selection-list">
                                {filteredUsers.map(u => (
                                    <div
                                        key={u.id}
                                        className="user-selection-item"
                                        onClick={() => handleCreateDm(u.id)}
                                    >
                                        <img src={u.avatar || getDefaultAvatar(u.id)} alt={u.name} />
                                        <div className="user-info-simple">
                                            <span className="user-name">{u.name}</span>
                                            <span className="user-username">@{u.username}</span>
                                        </div>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M5 12h14M12 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
