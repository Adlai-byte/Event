const crypto = require('crypto');

/**
 * DragonPay Payment Gateway Integration
 * 
 * Configuration:
 * - DRAGONPAY_MERCHANT_ID: Your DragonPay merchant ID
 * - DRAGONPAY_SECRET_KEY: Your DragonPay secret key
 * - DRAGONPAY_MODE: 'test' or 'production'
 */

const DRAGONPAY_CONFIG = {
    merchantId: process.env.DRAGONPAY_MERCHANT_ID,
    secretKey: process.env.DRAGONPAY_SECRET_KEY,
    mode: process.env.DRAGONPAY_MODE || 'test', // 'test' or 'production'
};

// Validate configuration
if (!DRAGONPAY_CONFIG.merchantId || !DRAGONPAY_CONFIG.secretKey) {
    console.warn('⚠️  WARNING: DragonPay credentials not configured!');
    console.warn('Please set DRAGONPAY_MERCHANT_ID and DRAGONPAY_SECRET_KEY in your .env file');
    console.warn('Get your credentials from: https://www.dragonpay.ph/');
}

// DragonPay API endpoints
const DRAGONPAY_URLS = {
    test: 'https://test.dragonpay.ph/Pay.aspx',
    production: 'https://gw.dragonpay.ph/Pay.aspx',
};

const DRAGONPAY_CALLBACK_URLS = {
    test: 'https://test.dragonpay.ph/Pay.aspx',
    production: 'https://gw.dragonpay.ph/Pay.aspx',
};

/**
 * Generate DragonPay payment URL for GCash
 * @param {Object} params - Payment parameters
 * @param {string} params.txnId - Unique transaction ID
 * @param {number} params.amount - Payment amount
 * @param {string} params.description - Transaction description
 * @param {string} params.email - Customer email
 * @param {string} params.callbackUrl - Callback URL for payment status updates
 * @param {string} params.returnUrl - Return URL after payment
 * @returns {string} DragonPay payment URL
 */
function generatePaymentUrl(params) {
    // Validate credentials are configured
    if (!DRAGONPAY_CONFIG.merchantId || !DRAGONPAY_CONFIG.secretKey) {
        throw new Error('DragonPay credentials not configured. Please set DRAGONPAY_MERCHANT_ID and DRAGONPAY_SECRET_KEY in your .env file');
    }
    
    const {
        txnId,
        amount,
        description,
        email,
        callbackUrl,
        returnUrl,
    } = params;

    const baseUrl = DRAGONPAY_URLS[DRAGONPAY_CONFIG.mode] || DRAGONPAY_URLS.test;
    
    // Build query parameters
    const queryParams = new URLSearchParams({
        merchantid: DRAGONPAY_CONFIG.merchantId,
        txnid: txnId,
        amount: amount.toFixed(2),
        ccy: 'PHP',
        description: description.substring(0, 60), // DragonPay limit
        email: email,
        procid: 'GCSH', // Direct to GCash
    });

    // Add callback and return URLs if provided
    if (callbackUrl) {
        queryParams.append('callbackurl', callbackUrl);
    }
    if (returnUrl) {
        queryParams.append('returnurl', returnUrl);
    }

    // Generate digest for security
    // Note: SHA1 is being sunsetted. DragonPay recommends migrating to HMAC-SHA256 or RSA-SHA256
    // Current format: merchantid:txnid:amount:ccy:description:email:secretkey
    // For HMAC-SHA256: message format includes amount
    const digestString = `${DRAGONPAY_CONFIG.merchantId}:${txnId}:${amount.toFixed(2)}:PHP:${description.substring(0, 60)}:${email}:${DRAGONPAY_CONFIG.secretKey}`;
    
    // Using SHA1 for now (legacy support)
    // TODO: Migrate to HMAC-SHA256 or RSA-SHA256 as per DragonPay v2.26 documentation
    const digest = crypto.createHash('sha1').update(digestString).digest('hex');
    queryParams.append('digest', digest);

    const paymentUrl = `${baseUrl}?${queryParams.toString()}`;
    
    // Log for debugging (remove in production)
    if (DRAGONPAY_CONFIG.mode === 'test') {
        console.log('DragonPay URL generated:', paymentUrl);
        console.log('Digest string:', digestString);
    }
    
    return paymentUrl;
}

/**
 * Verify DragonPay callback/notification
 * Supports both legacy SHA1 digest and newer HMAC-SHA256/RSA-SHA256 signatures
 * @param {Object} params - Callback parameters from DragonPay
 * @returns {boolean} True if valid, false otherwise
 */
function verifyCallback(params) {
    const {
        merchantid,
        txnid,
        refno,      // Reference number (for HMAC-SHA256)
        status,
        message,
        amount,     // Amount (required for HMAC-SHA256)
        ccy,        // Currency
        digest,     // SHA1 digest (legacy, being sunsetted)
        signature,  // HMAC-SHA256 or RSA-SHA256 signature (newer method)
    } = params;

    // Verify merchant ID
    if (merchantid !== DRAGONPAY_CONFIG.merchantId) {
        console.error('Merchant ID mismatch:', merchantid, 'expected:', DRAGONPAY_CONFIG.merchantId);
        return false;
    }

    // Try newer HMAC-SHA256 signature first (if available)
    // According to DragonPay v2.26 docs, HMAC-SHA256 message format: txnid:refno:status:message:amount
    if (signature) {
        try {
            // Build message for HMAC-SHA256
            // Format: txnid:refno:status:message:amount
            const refnoValue = refno || '';
            const messageValue = message || '';
            const amountValue = amount || '';
            const hmacMessage = `${txnid}:${refnoValue}:${status}:${messageValue}:${amountValue}`;
            
            // Generate HMAC-SHA256 signature
            const hmac = crypto.createHmac('sha256', DRAGONPAY_CONFIG.secretKey);
            hmac.update(hmacMessage);
            const expectedSignature = hmac.digest('hex').toUpperCase();
            
            // Compare signatures (case insensitive as per DragonPay docs)
            if (signature.toUpperCase() === expectedSignature) {
                console.log('✅ Callback verified using HMAC-SHA256 signature');
                return true;
            } else {
                console.warn('HMAC-SHA256 signature mismatch');
                console.warn('Expected:', expectedSignature);
                console.warn('Received:', signature.toUpperCase());
            }
        } catch (err) {
            console.error('Error verifying HMAC-SHA256 signature:', err);
        }
    }

    // Fallback to SHA1 digest (legacy support - being sunsetted)
    // Format: merchantid:txnid:status:message:secretkey
    if (digest) {
        const digestString = `${merchantid}:${txnid}:${status}:${message || ''}:${DRAGONPAY_CONFIG.secretKey}`;
        const expectedDigest = crypto.createHash('sha1').update(digestString).digest('hex');
        
        if (digest.toLowerCase() === expectedDigest.toLowerCase()) {
            console.log('✅ Callback verified using SHA1 digest (legacy)');
            console.warn('⚠️  SHA1 is being sunsetted. Please migrate to HMAC-SHA256 or RSA-SHA256');
            return true;
        } else {
            console.warn('SHA1 digest mismatch');
        }
    }

    console.error('❌ Callback verification failed - no valid signature or digest found');
    return false;
}

/**
 * Parse payment status from DragonPay status code
 * @param {string} status - DragonPay status code
 * @returns {string} Payment status ('pending', 'completed', 'failed')
 */
function parsePaymentStatus(status) {
    const statusMap = {
        'S': 'completed', // Success
        'F': 'failed',    // Failed
        'P': 'pending',   // Pending
        'U': 'pending',   // Unknown
        'R': 'failed',    // Refunded
        'K': 'failed',    // Cancelled
        'V': 'failed',    // Voided
        'A': 'pending',   // Authorized
    };

    return statusMap[status] || 'pending';
}

module.exports = {
    generatePaymentUrl,
    verifyCallback,
    parsePaymentStatus,
    DRAGONPAY_CONFIG,
};

