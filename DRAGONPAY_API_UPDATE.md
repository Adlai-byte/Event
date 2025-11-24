# DragonPay API v2.26 Implementation Notes

Based on the [official DragonPay API documentation](https://www.dragonpay.ph/wp-content/uploads/Dragonpay-PS-API-v2-latest.pdf), here are important updates:

## Key Changes in v2.26

### 1. Signature Migration

**Current Status:** SHA1 digest (legacy)
**Recommended:** HMAC-SHA256 or RSA-SHA256

According to the documentation:
- SHA1 digest is being sunsetted
- DragonPay recommends migrating to HMAC-SHA256 or RSA-SHA256
- RSA-SHA256 uses asymmetric encryption (public/private key)

**Action Required:**
- Contact DragonPay (devops@dragonpay.ph) to get:
  - HMAC-SHA256 secret key (or RSA-SHA256 public key)
  - Migration timeline

### 2. GCash Payment Flow Updates

**Important Changes:**
- All GCash transactions now require user authentication through GCash mobile app
- Two new payment methods:
  1. **Redirect Button** - Opens GCash app on same device
  2. **Redirect QR** - Dynamic QR code for scanning

**For Web-Based Platforms:**
- ✅ No action required - automatically supported

**For App-Based Platforms:**
- ⚠️ Code changes required to handle `gcash://` URL scheme

### 3. Implementation for Mobile Apps

If you're building a React Native app, you may need to handle GCash deep links:

```javascript
// Handle gcash:// URL scheme
import { Linking } from 'react-native';

// In your payment redirect handler
if (paymentUrl.startsWith('gcash://')) {
  Linking.openURL(paymentUrl).catch(err => {
    console.error('Failed to open GCash app:', err);
    // Fallback: open in browser
    Linking.openURL(paymentUrl.replace('gcash://', 'https://'));
  });
}
```

### 4. Callback Verification

**Current Implementation:**
- Supports SHA1 digest (legacy)
- Added HMAC-SHA256 signature verification (newer)

**Callback Parameters:**
- `txnid` - Transaction ID
- `refno` - Reference number
- `status` - Payment status (S=Success, F=Failed, P=Pending)
- `message` - Status message
- `amount` - Payment amount
- `ccy` - Currency
- `digest` - SHA1 digest (legacy)
- `signature` - HMAC-SHA256 or RSA-SHA256 signature (newer)
- `settledate` - Settlement date (new in v2.19)

### 5. IP Whitelisting

According to v2.26 documentation:
- DragonPay may require IP whitelisting for callbacks
- Contact DragonPay support to configure your server IP addresses

### 6. Public Key for RSA-SHA256

If using RSA-SHA256:
- Public key can be retrieved via API
- Should be cached and refreshed periodically
- See section 5.3.3 in the documentation

## Migration Checklist

- [ ] Contact DragonPay for HMAC-SHA256 or RSA-SHA256 credentials
- [ ] Update signature generation to use new method
- [ ] Update callback verification to support new signatures
- [ ] Test in DragonPay test environment
- [ ] Configure IP whitelisting if required
- [ ] Update mobile app to handle `gcash://` URLs (if applicable)
- [ ] Notify DragonPay when migration is complete

## Resources

- **DragonPay API Documentation:** https://www.dragonpay.ph/wp-content/uploads/Dragonpay-PS-API-v2-latest.pdf
- **DragonPay Support:** devops@dragonpay.ph
- **DragonPay Sales:** sales@dragonpay.ph

## Current Implementation Status

✅ **Working:**
- Payment URL generation with SHA1 digest
- Basic callback verification
- Web-based redirect to DragonPay

⚠️ **Needs Update:**
- Migrate to HMAC-SHA256 or RSA-SHA256 signatures
- Enhanced callback verification with new parameters
- Mobile app deep link handling (if needed)

## Next Steps

1. Get real DragonPay merchant credentials
2. Contact DragonPay about signature migration
3. Test payment flow in test environment
4. Implement mobile deep link handling if building mobile app
5. Configure IP whitelisting for production





