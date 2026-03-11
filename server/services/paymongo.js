/**
 * PayMongo Payment Gateway Integration
 * 
 * Documentation: https://developers.paymongo.com/
 * 
 * Configuration:
 * - PAYMONGO_SECRET_KEY: Your PayMongo secret key (starts with sk_)
 * - PAYMONGO_PUBLIC_KEY: Your PayMongo public key (starts with pk_) - optional for server-side
 * - PAYMONGO_MODE: 'test' or 'live'
 */

const PAYMONGO_CONFIG = {
    secretKey: process.env.PAYMONGO_SECRET_KEY,
    publicKey: process.env.PAYMONGO_PUBLIC_KEY,
    mode: process.env.PAYMONGO_MODE || 'test', // 'test' or 'live'
};

// PayMongo API endpoints
const PAYMONGO_URLS = {
    test: 'https://api.paymongo.com/v1',
    live: 'https://api.paymongo.com/v1',
};

// Validate configuration
if (!PAYMONGO_CONFIG.secretKey) {
    console.warn('⚠️  WARNING: PayMongo credentials not configured!');
    console.warn('Please set PAYMONGO_SECRET_KEY in your .env file');
    console.warn('Get your credentials from: https://dashboard.paymongo.com/');
}

/**
 * Create a Payment Intent for GCash
 * @param {Object} params - Payment parameters
 * @param {number} params.amount - Payment amount in cents (PHP: amount * 100)
 * @param {string} params.currency - Currency code (default: 'PHP')
 * @param {string} params.description - Transaction description
 * @param {Object} params.metadata - Additional metadata
 * @returns {Promise<Object>} Payment Intent object with checkout URL
 */
async function createPaymentIntent(params) {
    // Validate credentials
    if (!PAYMONGO_CONFIG.secretKey) {
        throw new Error('PayMongo credentials not configured. Please set PAYMONGO_SECRET_KEY in your .env file');
    }

    const {
        amount,
        currency = 'PHP',
        description,
        metadata = {},
    } = params;

    // Convert amount to cents (PayMongo uses smallest currency unit)
    const amountInCents = Math.round(amount * 100);

    const apiUrl = `${PAYMONGO_URLS[PAYMONGO_CONFIG.mode]}/payment_intents`;
    
    const requestBody = {
        data: {
            attributes: {
                amount: amountInCents,
                currency: currency,
                payment_method_allowed: ['gcash'],
                payment_method_options: {
                    gcash: {
                        success_url: metadata.success_url || 'https://your-domain.com/payment-success',
                        failed_url: metadata.failed_url || 'https://your-domain.com/payment-failed',
                    }
                },
                description: description || 'Payment for booking',
                metadata: metadata,
            }
        }
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${Buffer.from(PAYMONGO_CONFIG.secretKey + ':').toString('base64')}`,
            },
            body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        if (!response.ok) {
            const errorMessage = data.errors?.[0]?.detail || data.errors?.[0]?.title || 'Failed to create payment intent';
            throw new Error(errorMessage);
        }

        return data;
    } catch (error) {
        console.error('PayMongo API error:', error);
        throw error;
    }
}

/**
 * Attach a payment method to a payment intent and create a source
 * @param {string} paymentIntentId - Payment Intent ID
 * @param {string} returnUrl - URL to return after payment
 * @returns {Promise<Object>} Source object with checkout URL
 */
async function attachPaymentMethod(paymentIntentId, returnUrl) {
    if (!PAYMONGO_CONFIG.secretKey) {
        throw new Error('PayMongo credentials not configured');
    }

    const apiUrl = `${PAYMONGO_URLS[PAYMONGO_CONFIG.mode]}/payment_intents/${paymentIntentId}/attach`;
    
    const requestBody = {
        data: {
            attributes: {
                payment_method: 'gcash',
                return_url: returnUrl,
            }
        }
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${Buffer.from(PAYMONGO_CONFIG.secretKey + ':').toString('base64')}`,
            },
            body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        if (!response.ok) {
            const errorMessage = data.errors?.[0]?.detail || data.errors?.[0]?.title || 'Failed to attach payment method';
            throw new Error(errorMessage);
        }

        return data;
    } catch (error) {
        console.error('PayMongo attach payment method error:', error);
        throw error;
    }
}

/**
 * Create a GCash source for payment
 * @param {Object} params - Payment parameters
 * @param {number} params.amount - Payment amount
 * @param {string} params.currency - Currency code
 * @param {string} params.redirectSuccessUrl - Success redirect URL
 * @param {string} params.redirectFailedUrl - Failed redirect URL
 * @param {Object} params.metadata - Additional metadata
 * @returns {Promise<Object>} Source object with checkout URL
 */
async function createGCashSource(params) {
    if (!PAYMONGO_CONFIG.secretKey) {
        throw new Error('PayMongo credentials not configured');
    }

    const {
        amount,
        currency = 'PHP',
        redirectSuccessUrl,
        redirectFailedUrl,
        metadata = {},
    } = params;

    // Convert amount to cents
    const amountInCents = Math.round(amount * 100);

    const apiUrl = `${PAYMONGO_URLS[PAYMONGO_CONFIG.mode]}/sources`;
    
    const requestBody = {
        data: {
            attributes: {
                type: 'gcash',
                amount: amountInCents,
                currency: currency,
                redirect: {
                    success: redirectSuccessUrl,
                    failed: redirectFailedUrl,
                },
                metadata: metadata,
            }
        }
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${Buffer.from(PAYMONGO_CONFIG.secretKey + ':').toString('base64')}`,
            },
            body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        if (!response.ok) {
            const errorMessage = data.errors?.[0]?.detail || data.errors?.[0]?.title || 'Failed to create GCash source';
            throw new Error(errorMessage);
        }

        return data;
    } catch (error) {
        console.error('PayMongo create source error:', error);
        throw error;
    }
}

/**
 * Create an InstaPay payment using Payment Intents
 * InstaPay is a real-time electronic fund transfer service in the Philippines
 * @param {Object} params - Payment parameters
 * @param {number} params.amount - Payment amount
 * @param {string} params.description - Transaction description
 * @param {string} params.successUrl - Success redirect URL
 * @param {string} params.failedUrl - Failed redirect URL
 * @param {Object} params.metadata - Additional metadata
 * @returns {Promise<Object>} Payment object with checkout URL
 */
async function createInstaPayPayment(params) {
    if (!PAYMONGO_CONFIG.secretKey) {
        throw new Error('PayMongo credentials not configured');
    }

    const {
        amount,
        description,
        successUrl,
        failedUrl,
        metadata = {},
    } = params;

    // Convert amount to cents
    const amountInCents = Math.round(amount * 100);

    // Create Payment Intent with InstaPay
    const apiUrl = `${PAYMONGO_URLS[PAYMONGO_CONFIG.mode]}/payment_intents`;
    
    const requestBody = {
        data: {
            attributes: {
                amount: amountInCents,
                currency: 'PHP',
                payment_method_allowed: ['instapay'],
                description: description || 'Payment for booking',
                metadata: metadata,
            }
        }
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${Buffer.from(PAYMONGO_CONFIG.secretKey + ':').toString('base64')}`,
            },
            body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        if (!response.ok) {
            const errorMessage = data.errors?.[0]?.detail || data.errors?.[0]?.title || 'Failed to create InstaPay payment intent';
            throw new Error(errorMessage);
        }

        const paymentIntentId = data.data.id;
        
        // For InstaPay, we need to create a payment method first, then attach it
        // Create payment method for InstaPay
        const paymentMethodUrl = `${PAYMONGO_URLS[PAYMONGO_CONFIG.mode]}/payment_methods`;
        
        const paymentMethodBody = {
            data: {
                attributes: {
                    type: 'bank_transfer',
                    details: {
                        bank_code: 'instapay',
                    }
                }
            }
        };

        const pmResponse = await fetch(paymentMethodUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${Buffer.from(PAYMONGO_CONFIG.secretKey + ':').toString('base64')}`,
            },
            body: JSON.stringify(paymentMethodBody),
        });

        const pmData = await pmResponse.json();

        if (!pmResponse.ok) {
            // If payment method creation fails, try using the payment intent's next_action directly
            const checkoutUrl = data.data.attributes.next_action?.redirect?.url;
            if (checkoutUrl) {
                return {
                    paymentIntentId: paymentIntentId,
                    checkoutUrl: checkoutUrl,
                    status: data.data.attributes.status,
                    amount: amountInCents,
                    currency: 'PHP',
                };
            }
            const errorMessage = pmData.errors?.[0]?.detail || pmData.errors?.[0]?.title || 'Failed to create InstaPay payment method';
            throw new Error(errorMessage);
        }

        const paymentMethodId = pmData.data.id;

        // Attach payment method to payment intent
        const attachUrl = `${PAYMONGO_URLS[PAYMONGO_CONFIG.mode]}/payment_intents/${paymentIntentId}/attach`;
        
        const attachBody = {
            data: {
                attributes: {
                    payment_method: paymentMethodId,
                    return_url: successUrl,
                }
            }
        };

        const attachResponse = await fetch(attachUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${Buffer.from(PAYMONGO_CONFIG.secretKey + ':').toString('base64')}`,
            },
            body: JSON.stringify(attachBody),
        });

        const attachData = await attachResponse.json();

        if (!attachResponse.ok) {
            const errorMessage = attachData.errors?.[0]?.detail || attachData.errors?.[0]?.title || 'Failed to attach InstaPay payment method';
            throw new Error(errorMessage);
        }

        // Get checkout URL from next_action
        const checkoutUrl = attachData.data.attributes.next_action?.redirect?.url;

        if (!checkoutUrl) {
            throw new Error('Failed to get checkout URL from PayMongo payment intent');
        }

        return {
            paymentIntentId: paymentIntentId,
            checkoutUrl: checkoutUrl,
            status: attachData.data.attributes.status,
            amount: amountInCents,
            currency: 'PHP',
        };
    } catch (error) {
        console.error('PayMongo InstaPay payment error:', error);
        throw error;
    }
}

/**
 * Create a PayMongo Checkout Session
 * Checkout Sessions are the recommended way for API integrations per PayMongo docs
 * @param {Object} params - Payment parameters
 * @param {number} params.amount - Payment amount
 * @param {string} params.description - Transaction description
 * @param {string} params.successUrl - Success redirect URL
 * @param {string} params.failedUrl - Failed redirect URL
 * @param {Object} params.metadata - Additional metadata
 * @param {string} params.secretKey - Optional: Provider's secret key (overrides global config)
 * @param {string} params.mode - Optional: Provider's mode (overrides global config)
 * @returns {Promise<Object>} Checkout session object with checkout URL
 */
async function createCheckoutSession(params) {
    const {
        amount,
        description,
        successUrl,
        failedUrl,
        metadata = {},
        secretKey,
        mode,
    } = params;

    // Use provider credentials if provided, otherwise fall back to global config
    const credentials = {
        secretKey: secretKey || PAYMONGO_CONFIG.secretKey,
        mode: mode || PAYMONGO_CONFIG.mode || 'test',
    };

    if (!credentials.secretKey) {
        throw new Error('PayMongo credentials not configured');
    }

    // Log which credentials are being used
    const isUsingProviderCredentials = !!secretKey;
    console.log(`[PayMongo] Creating checkout session using ${isUsingProviderCredentials ? 'PROVIDER' : 'GLOBAL'} credentials:`, {
        mode: credentials.mode,
        secretKeyPrefix: credentials.secretKey.substring(0, 10) + '...',
    });

    // Convert amount to cents
    const amountInCents = Math.round(amount * 100);

    // Create Checkout Session via PayMongo API
    const apiUrl = `${PAYMONGO_URLS[credentials.mode]}/checkout_sessions`;
    
    const requestBody = {
        data: {
            attributes: {
                line_items: [
                    {
                        name: description || 'Payment for booking',
                        quantity: 1,
                        amount: amountInCents,
                        currency: 'PHP',
                    }
                ],
                payment_method_types: ['card', 'gcash', 'paymaya', 'grab_pay', 'qrph'],
                success_url: successUrl,
                cancel_url: failedUrl,
                description: description || 'Payment for booking',
                metadata: metadata,
            }
        }
    };

    try {
        console.log('Creating PayMongo checkout session:', {
            amount: amountInCents,
            currency: 'PHP',
            description: description,
        });

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${Buffer.from(credentials.secretKey + ':').toString('base64')}`,
            },
            body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('PayMongo Checkout Session API error response:', {
                status: response.status,
                statusText: response.statusText,
                errors: data.errors,
                fullResponse: JSON.stringify(data, null, 2),
            });
            
            const errorMessage = data.errors?.[0]?.detail || data.errors?.[0]?.title || 'Failed to create checkout session';
            throw new Error(errorMessage);
        }

        const sessionId = data.data.id;
        const checkoutUrl = data.data.attributes.checkout_url;

        if (!checkoutUrl) {
            console.error('Checkout session created but no checkout URL:', data);
            throw new Error('Failed to get checkout URL from PayMongo checkout session');
        }

        console.log('Checkout session created successfully:', {
            sessionId,
            checkoutUrl,
            status: data.data.attributes.status,
        });

        return {
            sessionId: sessionId,
            checkoutUrl: checkoutUrl,
            status: data.data.attributes.status,
            amount: amountInCents,
            currency: 'PHP',
        };
    } catch (error) {
        console.error('PayMongo create checkout session error:', error);
        console.error('Request details:', {
            url: apiUrl,
            body: JSON.stringify(requestBody, null, 2),
        });
        throw error;
    }
}

/**
 * Create a PayMongo Payment Link dynamically
 * Payment Links work with any enabled payment methods in your PayMongo account
 * @param {Object} params - Payment parameters
 * @param {number} params.amount - Payment amount
 * @param {string} params.description - Transaction description
 * @param {string} params.successUrl - Success redirect URL
 * @param {string} params.failedUrl - Failed redirect URL
 * @param {Object} params.metadata - Additional metadata
 * @param {string} params.secretKey - Optional: Provider's secret key (overrides global config)
 * @param {string} params.mode - Optional: Provider's mode (overrides global config)
 * @returns {Promise<Object>} Payment link object with checkout URL
 */
async function createPaymentLink(params) {
    const {
        amount,
        description,
        successUrl,
        failedUrl,
        metadata = {},
        secretKey,
        mode,
    } = params;

    // Use provider credentials if provided, otherwise fall back to global config
    const credentials = {
        secretKey: secretKey || PAYMONGO_CONFIG.secretKey,
        mode: mode || PAYMONGO_CONFIG.mode || 'test',
    };

    if (!credentials.secretKey) {
        throw new Error('PayMongo credentials not configured');
    }

    // Log which credentials are being used
    const isUsingProviderCredentials = !!secretKey;
    console.log(`[PayMongo] Creating payment link using ${isUsingProviderCredentials ? 'PROVIDER' : 'GLOBAL'} credentials:`, {
        mode: credentials.mode,
        secretKeyPrefix: credentials.secretKey.substring(0, 10) + '...',
    });

    // Convert amount to cents
    const amountInCents = Math.round(amount * 100);

    // Create Payment Link via PayMongo API
    const apiUrl = `${PAYMONGO_URLS[credentials.mode]}/links`;
    
    // Build request body - only include defined fields
    const attributes = {
        amount: amountInCents,
        currency: 'PHP',
        description: description || 'Payment for booking',
    };
    
    // Add remarks if booking_id exists
    if (metadata.booking_id) {
        attributes.remarks = `Booking ID: ${metadata.booking_id}`;
    }
    
    const requestBody = {
        data: {
            attributes: attributes
        }
    };

    try {
        console.log('Creating PayMongo payment link:', {
            amount: amountInCents,
            currency: 'PHP',
            description: attributes.description,
        });

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${Buffer.from(credentials.secretKey + ':').toString('base64')}`,
            },
            body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('PayMongo API error response:', {
                status: response.status,
                statusText: response.statusText,
                errors: data.errors,
                fullResponse: JSON.stringify(data, null, 2),
            });
            
            const errorMessage = data.errors?.[0]?.detail || data.errors?.[0]?.title || 'Failed to create payment link';
            throw new Error(errorMessage);
        }

        const linkId = data.data.id;
        const checkoutUrl = data.data.attributes.checkout_url;

        if (!checkoutUrl) {
            console.error('Payment link created but no checkout URL:', data);
            throw new Error('Failed to get checkout URL from PayMongo payment link');
        }

        console.log('Payment link created successfully:', {
            linkId,
            checkoutUrl,
            status: data.data.attributes.status,
        });

        return {
            linkId: linkId,
            checkoutUrl: checkoutUrl,
            status: data.data.attributes.status,
            amount: amountInCents,
            currency: 'PHP',
        };
    } catch (error) {
        console.error('PayMongo create payment link error:', error);
        console.error('Request details:', {
            url: apiUrl,
            body: JSON.stringify(requestBody, null, 2),
        });
        throw error;
    }
}

/**
 * Create a GCash payment (simplified flow using Sources)
 * For GCash, we use Sources API which provides a checkout URL directly
 * @param {Object} params - Payment parameters
 * @param {number} params.amount - Payment amount
 * @param {string} params.description - Transaction description
 * @param {string} params.successUrl - Success redirect URL
 * @param {string} params.failedUrl - Failed redirect URL
 * @param {Object} params.metadata - Additional metadata
 * @returns {Promise<Object>} Payment object with checkout URL
 */
async function createGCashPayment(params) {
    const {
        amount,
        description,
        successUrl,
        failedUrl,
        metadata = {},
    } = params;

    // Create GCash source (this provides the checkout URL directly)
    const source = await createGCashSource({
        amount,
        currency: 'PHP',
        redirectSuccessUrl: successUrl,
        redirectFailedUrl: failedUrl,
        metadata: {
            ...metadata,
            description: description,
        },
    });

    const sourceId = source.data.id;
    const checkoutUrl = source.data.attributes.redirect?.checkout_url;

    if (!checkoutUrl) {
        throw new Error('Failed to get checkout URL from PayMongo source');
    }

    return {
        sourceId: sourceId,
        checkoutUrl: checkoutUrl,
        status: source.data.attributes.status,
        amount: source.data.attributes.amount,
        currency: source.data.attributes.currency,
    };
}

/**
 * Retrieve payment intent status
 * @param {string} paymentIntentId - Payment Intent ID
 * @returns {Promise<Object>} Payment Intent object
 */
async function getPaymentIntent(paymentIntentId) {
    if (!PAYMONGO_CONFIG.secretKey) {
        throw new Error('PayMongo credentials not configured');
    }

    const apiUrl = `${PAYMONGO_URLS[PAYMONGO_CONFIG.mode]}/payment_intents/${paymentIntentId}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${Buffer.from(PAYMONGO_CONFIG.secretKey + ':').toString('base64')}`,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            const errorMessage = data.errors?.[0]?.detail || data.errors?.[0]?.title || 'Failed to retrieve payment intent';
            throw new Error(errorMessage);
        }

        return data;
    } catch (error) {
        console.error('PayMongo get payment intent error:', error);
        throw error;
    }
}

/**
 * Parse payment status from PayMongo status
 * @param {string} status - PayMongo payment status
 * @returns {string} Payment status ('pending', 'completed', 'failed')
 */
function parsePaymentStatus(status) {
    const statusMap = {
        'awaiting_payment_method': 'pending',
        'awaiting_next_action': 'pending',
        'processing': 'pending',
        'succeeded': 'completed',
        'succeeded_and_captured': 'completed',
        'payment_failed': 'failed',
        'canceled': 'failed',
        'requires_payment_method': 'pending',
    };

    return statusMap[status] || 'pending';
}

/**
 * Create a refund for a completed payment via PayMongo
 * @param {Object} params - Refund parameters
 * @param {string} params.paymentId - PayMongo payment ID to refund
 * @param {number} params.amount - Refund amount (will be converted to cents)
 * @param {string} params.reason - Reason for refund
 * @param {string} params.notes - Additional notes
 * @returns {Promise<Object>} Refund object
 */
async function createRefund(params) {
    if (!PAYMONGO_CONFIG.secretKey) {
        throw new Error('PayMongo credentials not configured');
    }

    const { paymentId, amount, reason = 'requested_by_customer', notes = '' } = params;
    const amountInCents = Math.round(amount * 100);

    const apiUrl = `${PAYMONGO_URLS[PAYMONGO_CONFIG.mode]}/refunds`;

    const requestBody = {
        data: {
            attributes: {
                amount: amountInCents,
                payment_id: paymentId,
                reason: reason,
                notes: notes,
            }
        }
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${Buffer.from(PAYMONGO_CONFIG.secretKey + ':').toString('base64')}`,
            },
            body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        if (!response.ok) {
            const errorMessage = data.errors?.[0]?.detail || data.errors?.[0]?.title || 'Failed to create refund';
            throw new Error(errorMessage);
        }

        return {
            refundId: data.data.id,
            amount: data.data.attributes.amount,
            currency: data.data.attributes.currency,
            status: data.data.attributes.status,
        };
    } catch (error) {
        console.error('PayMongo create refund error:', error);
        throw error;
    }
}

/**
 * Generate an HMAC token for securing payment callback URLs.
 * Prevents unauthorized users from faking payment success/failure.
 * @param {string|number} bookingId
 * @param {string} userEmail
 * @returns {string} hex HMAC token
 */
function generatePaymentToken(bookingId, userEmail) {
    const crypto = require('crypto');
    const secret = process.env.PAYMENT_CALLBACK_SECRET || PAYMONGO_CONFIG.secretKey || 'e-vent-payment-secret';
    return crypto.createHmac('sha256', secret).update(`${bookingId}:${userEmail}`).digest('hex');
}

/**
 * Verify an HMAC token from a payment callback URL.
 * @param {string|number} bookingId
 * @param {string} userEmail
 * @param {string} token - The token from the callback URL
 * @returns {boolean} True if valid
 */
function verifyPaymentToken(bookingId, userEmail, token) {
    if (!token) return false;
    const expected = generatePaymentToken(bookingId, userEmail);
    const crypto = require('crypto');
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}

module.exports = {
    createGCashPayment,
    createInstaPayPayment,
    createPaymentLink,
    createCheckoutSession,
    createGCashSource,
    createPaymentIntent,
    attachPaymentMethod,
    getPaymentIntent,
    parsePaymentStatus,
    createRefund,
    generatePaymentToken,
    verifyPaymentToken,
    PAYMONGO_CONFIG,
};

