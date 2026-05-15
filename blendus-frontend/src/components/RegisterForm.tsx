import React, { useState } from 'react';
import { api } from '../lib/api';
import { setAuth } from '../stores/authStore';
import './RegisterForm.css';

export default function RegisterForm() {
    const [form, setForm] = useState({ name: '', username: '', email: '', password: '', password_confirmation: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm(f => ({ ...f, [e.target.id]: e.target.value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (form.password !== form.password_confirmation) {
            setError('Passwords do not match.');
            return;
        }
        setLoading(true);
        try {
            const res = await api.register({
                name: form.username,
                username: form.username,
                email: form.email,
                password: form.password,
                password_confirmation: form.password_confirmation
            });
            setAuth(res.token, res.user);
            window.location.href = '/';
        } catch (err: any) {
            setError(err.message ?? 'Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form className='register-form' onSubmit={handleSubmit}>
            <div className="username">
                <label className="label" htmlFor="username">Username</label>
                <input className="text-input" type="text" id="username" placeholder='Username' required value={form.username} onChange={handleChange} />
            </div>
            <div className="email">
                <label className="label" htmlFor="email">Email</label>
                <input className="text-input" type="email" id="email" placeholder='youremail@example.org' required value={form.email} onChange={handleChange} />
            </div>
            <div className="birthdate">
                <label className="label" htmlFor="birthdate">Date of birth</label>
                <div className="day-month-year">
                    <select className="text-input birthdate-input" id="day" defaultValue="" onChange={handleChange}>
                        <option value="" disabled>Day</option>
                        {[...Array(31)].map((_, i) => (
                            <option key={i} value={i + 1}>{i + 1}</option>
                        ))}
                    </select>
                    <select className="text-input birthdate-input" id="month" defaultValue="" onChange={handleChange}>
                        <option value="" disabled>Month</option>
                        <option value="1">January</option>
                        <option value="2">February</option>
                        <option value="3">March</option>
                        <option value="4">April</option>
                        <option value="5">May</option>
                        <option value="6">June</option>
                        <option value="7">July</option>
                        <option value="8">August</option>
                        <option value="9">September</option>
                        <option value="10">October</option>
                        <option value="11">November</option>
                        <option value="12">December</option>
                    </select>
                    <select className="text-input birthdate-input" id="year" defaultValue="" onChange={handleChange}>
                        <option value="" disabled>Year</option>
                        {[...Array(100)].map((_, i) => (
                            <option key={i} value={2026 - i}>{2026 - i}</option>
                        ))}
                    </select>
                </div>
            </div>
            <div className="password">
                <label className="label" htmlFor="password">Password</label>
                <input className="text-input" type="password" id="password" placeholder='Password' required minLength={8} value={form.password} onChange={handleChange} />
            </div>
            <div className="repeat-password">
                <label className="label" htmlFor="password_confirmation">Repeat Password</label>
                <input className="text-input" type="password" id="password_confirmation" placeholder='Repeat password' required minLength={8} value={form.password_confirmation} onChange={handleChange} />
            </div>

            {error && <p className="form-error-inline">{error}</p>}

            <button className="register-btn" type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Register'}
            </button>
            <button type="button" className="secondary-btn-alt" onClick={() => window.location.href = '/login'}>
                I already have an account
            </button>
            <div className="guest-divider">
                <a href="/" className="guest-link">Continue as Guest</a>
            </div>
        </form>
    );
}
