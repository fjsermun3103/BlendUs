import { useState, useEffect } from 'react';
import './ChatPreviewWidget.css';
import { openChat, closeChat, type ChatData } from '../stores/chatStore';
import { api } from '../lib/api';
import { $user as $authUser } from '../stores/authStore';
import { getDefaultAvatar } from '../lib/utils';

export default function ChatPreviewWidget() {
    const [chats, setChats] = useState<ChatData[]>([]);
    
    useEffect(() => {
        const fetchChats = async () => {
            try {
                const res = await api.getConversations();
                const authUser = $authUser.get();
                
                const mappedChats = res.map((conv: any) => {
                    const isGroup = conv.type === 'group';
                    let name = conv.name || 'Conversation';
                    let avatar = isGroup ? '/assets/avatars/group-avatar.svg' : (conv.avatar || '/assets/avatars/no-user-pfp.svg');

                    if (!isGroup && conv.participants) {
                        const otherUser = conv.participants.find((p: any) => p.id !== authUser?.id);
                        if (otherUser) {
                            name = otherUser.name;
                            avatar = otherUser.avatar || getDefaultAvatar(otherUser.id);
                        }
                    }

                    return {
                        id: conv.id,
                        name: name,
                        avatar_url: avatar,
                        is_group: isGroup,
                        last_message: conv.last_message?.body || '',
                        unread_count: conv.unread_count || 0,
                        other_user_id: !isGroup && conv.participants ? conv.participants.find((p: any) => p.id !== authUser?.id)?.id : undefined,
                        last_activity: conv.last_message?.created_at || conv.created_at
                    };
                });
                
                // Sort by latest message/creation
                mappedChats.sort((a, b) => 
                    new Date(b.last_activity || 0).getTime() - new Date(a.last_activity || 0).getTime()
                );

                setChats(mappedChats);
            } catch (err) {
                console.error("Failed to load chats", err);
            }
        };

        if ($authUser.get()) {
            fetchChats();
            const interval = setInterval(fetchChats, 10000); // 10s poll
            return () => clearInterval(interval);
        }
    }, []);

    return (
        <div className="trending-card chat-preview-card">
            <div className="trending-title" style={{ paddingLeft: '8px' }}>
                <h2>Messages</h2>
            </div>
            
            <div className="chat-list">
                {chats.length === 0 && (
                    <p className="no-chats-msg">No messages yet.</p>
                )}
                {chats.slice(0, 3).map(chat => (
                    <div className="hashtag-row chat-row" key={chat.id} onClick={() => openChat(chat)}>
                        <div className="hashtag-info">
                            <div className="chat-avatar">
                                <img src={chat.avatar_url} alt={chat.name} />
                            </div>
                            <div className="chat-content">
                                <div className="hashtag-tag-name">{chat.name}</div>
                                <div className="hashtag-count chat-preview-text">{chat.last_message}</div>
                            </div>
                        </div>
                        {chat.unread_count > 0 && (
                            <div className="unread-badge">{chat.unread_count}</div>
                        )}
                    </div>
                ))}
            </div>

            <a href="/messages" className="view-all-chats" onClick={() => closeChat()}>
                See all messages
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
            </a>
        </div>
    );
}
