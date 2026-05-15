import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Product } from '../lib/api';
import PaymentForm from './PaymentForm';
import './PaymentPage.css';

interface Props {
    productId: string;
}

export default function PaymentPage({ productId }: Props) {
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const id = parseInt(productId);
        if (isNaN(id)) {
            setError('Invalid product ID');
            setLoading(false);
            return;
        }

        api.getProducts()
            .then(products => {
                const p = products.find(prod => prod.id === id);
                if (p) {
                    setProduct(p);
                } else {
                    setError('Product not found');
                }
                setLoading(false);
            })
            .catch(err => {
                setError(err.message || 'Failed to load product');
                setLoading(false);
            });
    }, [productId]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!product) return;
        
        try {
            // Note: The form data here is just a mockup for the frontend design.
            // For actual PCI-compliant payments, we redirect to Stripe Checkout.
            const { checkout_url } = await api.checkoutProduct(product.id);
            if (checkout_url) {
                window.location.href = checkout_url;
            }
        } catch (err: any) {
            alert(err.message || 'Checkout failed. Please ensure you are logged in.');
        }
    };

    if (loading) return <div className="loading-container">Loading payment details...</div>;
    if (error || !product) return <div className="error-container">{error || 'Product not found'}</div>;

    const price = (product.price_cents / 100).toFixed(2);

    return (
        <section className="payment-wrapper">
            <section className="page-title">
                <a href={`/marketplace/product/${product.id}`} className="back">
                    <svg xmlns="http://www.w3.org/2000/svg" height="28px" viewBox="0 -960 960 960" width="28px" fill="#4a5565">
                        <path d="m313-440 224 224-57 56-320-320 320-320 57 56-224 224h487v80H313Z" />
                    </svg>
                </a>
                <div className="title-subtitle">    
                    <h1>Get this product!</h1>
                    <h3>Enter your details to complete the payment</h3>
                </div>
            </section>
            
            <section className="payment-details">
                <section className="product-details">
                    <h3 className="details-header">Order Summary</h3>
                    <div className="product">
                        <div className="product-image">
                            <img 
                                src={product.image_url} 
                                alt={product.name} 
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/assets/smoothie2.webp';
                                }}
                            />
                        </div>
                        <div className="product-info">
                            <div className="name-price">
                                <div className="product-name">{product.name}</div>
                                <div className="price">€{price}</div>
                            </div>
                            <div className="product-tags">
                                <div className="category">Marketplace Item</div>
                                <div className="quantity">Qty: 1</div>
                            </div>
                        </div>
                    </div>
                    <div className="divider"></div>
                    <div className="summary-row">
                        <span>Subtotal:</span>
                        <span>€{price}</span>
                    </div>
                    <div className="summary-row">
                        <span>Shipping:</span>
                        <span>FREE</span>
                    </div>
                    <div className="summary-row total">
                        <span>Total:</span>
                        <span>€{price}</span>
                    </div>
                    <div className="secure-box">
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#fd9a00">
                            <path d="m387-412 35-114-92-74h114l36-112 36 112h114l-93 74 35 114-92-71-93 71ZM240-40v-309q-38-42-59-96t-21-115q0-134 93-227t227-93q134 0 227 93t93 227q0 61-21 115t-59 96v309l-240-80-240 80Zm410-350q70-70 70-170t-70-170q-70-70-170-70t-170 70q-70 70-70 170t70 170q70 70 170 70t170-70ZM320-159l160-41 160 41v-124q-35 20-75.5 31.5T480-240q-44 0-84.5-11.5T320-283v124Zm160-62Z"/>
                        </svg>
                        <p>Secure & Scripted Checkout</p>
                    </div>
                </section>
                <PaymentForm onSubmit={handleSubmit} />
            </section>
        </section>
    );
}
