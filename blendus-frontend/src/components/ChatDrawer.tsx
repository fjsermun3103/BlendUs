import { useStore } from '@nanostores/react';
import { activeChat, isChatDrawerOpen, closeChat } from '../stores/chatStore';
import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { $user as $authUser } from '../stores/authStore';
import './ChatDrawer.css';

export default function ChatDrawer() {
    const chat = useStore(activeChat);
    const isOpen = useStore(isChatDrawerOpen);
    
    // Dummy messages state
    const [messages, setMessages] = useState<{sender: 'me' | 'them', text: string}[]>([]);
    const [draft, setDraft] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chat && isOpen) {
            const fetch = () => {
                api.getMessages(chat.id).then((msgs: any[]) => {
                    const authUser = $authUser.get();
                    setMessages(msgs.reverse().map(m => ({
                        sender: m.sender?.id === authUser?.id ? 'me' : 'them',
                        text: m.body
                    })));
                }).catch(console.error);
            };

            fetch();
            const interval = setInterval(fetch, 5000);
            return () => clearInterval(interval);
        }
    }, [chat, isOpen]);

    // Prevent body scrolling when the drawer is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    }, [isOpen, messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!draft.trim() || !chat) return;
        
        const outgoingText = draft;
        setMessages(prev => [...prev, { sender: 'me', text: outgoingText }]);
        setDraft('');

        try {
            await api.sendMessage(chat.id, outgoingText);
        } catch (err) {
            console.error('Failed to send message:', err);
        }
    };

    if (!chat) return null;

    return (
        <>
            {isOpen && <div className="chat-drawer-backdrop" onClick={closeChat}></div>}
            
            <div className={`chat-drawer ${isOpen ? 'open' : ''}`}>
                <div className="chat-drawer-header">
                    <div className="chat-drawer-header-info">
                        <img src={chat.avatar_url} alt={chat.name} className="chat-drawer-avatar"/>
                        {chat.other_user_id ? (
                            <a href={`/profile/${chat.other_user_id}`} className="chat-drawer-title" style={{ textDecoration: 'none', color: 'inherit' }}>
                                <h3>{chat.name}</h3>
                                <span className="chat-drawer-status">Online</span>
                            </a>
                        ) : (
                            <div className="chat-drawer-title">
                                <h3>{chat.name}</h3>
                                <span className="chat-drawer-status">Online</span>
                            </div>
                        )}
                    </div>
                    <div className="chat-drawer-header-actions">
                        <a href="/messages" className="expand-chat-btn" title="Open Full Chat" onClick={() => closeChat()}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                            </svg>
                        </a>
                        <button className="chat-drawer-close" onClick={closeChat} title="Close">
                            &times;
                        </button>
                    </div>
                </div>
                
                <div className="chat-drawer-messages">
                    {messages.map((msg, i) => (
                        <div key={i} className={`drawer-bubble ${msg.sender}`}>
                            {msg.text}
                        </div>
                    ))}
                    <div ref={chatEndRef} />
                </div>
                
                <form className="chat-drawer-input" onSubmit={handleSend}>
                    <input 
                        type="text" 
                        placeholder="Type a message..." 
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                    />
                    <button type="submit" disabled={!draft.trim()}>
                        <svg width="20px" height="20px" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                    </button>
                </form>
            </div>
        </>
    );
}
