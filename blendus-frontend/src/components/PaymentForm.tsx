import React from 'react';
import './PaymentForm.css';

interface Props {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export default function PaymentForm({ onSubmit }: Props) {
  return (
    <form className="payment-form" onSubmit={onSubmit} style={{ height: '100%', margin: 0 }}>
        <div className="pf-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '3rem 2rem', height: '100%', justifyContent: 'center', gap: '0' }}>
            <svg xmlns="http://www.w3.org/2000/svg" height="80px" viewBox="0 -960 960 960" width="80px" fill="var(--amber-600)">
                <path d="M240-80q-33 0-56.5-23.5T160-160v-400q0-33 23.5-56.5T240-640h40v-80q0-83 58.5-141.5T480-920q83 0 141.5 58.5T680-720v80h40q33 0 56.5 23.5T800-560v400q0 33-23.5 56.5T720-80H240Zm240-200q33 0 56.5-23.5T560-360q0-33-23.5-56.5T480-440q-33 0-56.5 23.5T400-360q0 33 23.5 56.5T480-280ZM360-640h240v-80q0-50-35-85t-85-35q-50 0-85 35t-35 85v80Z"/>
            </svg>
            <h2 style={{ color: 'var(--gray-900)', marginTop: '1.5rem', fontSize: '1.5rem' }}>Secure Stripe Checkout</h2>
            <p style={{ color: 'var(--gray-600)', margin: '1rem 0 2rem 0', lineHeight: '1.6', maxWidth: '400px' }}>
                We use Stripe to securely process your payments. Click the button below to be redirected to our encrypted checkout environment where you can safely enter your payment details.
            </p>
            <button type="submit" className="btn pay-btn" style={{ backgroundColor: 'var(--amber-600)', color: 'white', width: '100%', maxWidth: '350px', padding: '1rem', borderRadius: '100px', fontSize: '1.1rem', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s', marginTop: 'auto' }}>
                Proceed to Checkout
            </button>
        </div>
    </form>
  );
}
