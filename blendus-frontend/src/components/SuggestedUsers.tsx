import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import type { User } from '../lib/api';
import { getDefaultAvatar } from '../lib/utils';
import './SuggestedComponent.css';

export default function SuggestedUsers() {
    const [users, setUsers] = useState<User[]>([]);

    useEffect(() => {
        api.getSuggestedUsers().catch(() => {
            // fallback to static list if not logged in
            setUsers([
                { id: 1, name: 'John Smoothie', posts_count: 12 } as User,
                { id: 2, name: 'Marie Parker', posts_count: 8 } as User,
                { id: 3, name: 'Julia Rivera', posts_count: 6 } as User,
            ]);
        }).then(data => data && setUsers(data));
    }, []);

    const descriptions: Record<number, string> = {
        1: 'Great at fruit combos',
        2: '+500 recipes',
        3: 'Experienced nutritionist',
        4: 'Loves matcha 🍵',
        5: 'Protein shake expert 💪',
    };

    return (
        <div className="suggested-card">
            <h2>Suggested for you</h2>
            <div className="suggested-users">

                {users.map((user) => (
                    <div className="suggested-user-row" key={user.id}>
                        <div className="suggested-user-info">
                            <a href={`/profile/${user.id}`} className="user-circle">
                                {user.avatar ? (
                                    <img src={user.avatar} alt={user.name} />
                                ) : (
                                    <img src={getDefaultAvatar(user.id)} alt={user.name} />
                                )}
                            </a>
                            <div className="suggested-user-text">
                                <div className="suggested-name">{user.name}</div>
                                <div className="suggested-desc">{descriptions[user.id] ?? `${user.posts_count ?? 0} posts`}</div>
                            </div>
                        </div>
                        <a href={`/profile/${user.id}`} className="btn" style={{ fontSize: '.8rem', padding: '.35rem .9rem' }}>
                            View
                        </a>
                    </div>
                ))}
            </div>
        </div>
    );
}
