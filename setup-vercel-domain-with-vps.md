# Setup Vercel Domain with VPS Backend

## Understanding
- **Vercel Domain** (`e-vent-jade.vercel.app`) = Frontend (already working)
- **VPS Backend** = Needs separate domain/subdomain for API

## Option 1: Use Subdomain of Your Custom Domain (If You Have One)

If you have a custom domain connected to Vercel:
1. Create subdomain: `api.yourdomain.com`
2. Point it to Cloudflare Tunnel
3. Use: `https://api.yourdomain.com`

## Option 2: Get Free Domain for API

1. Get free domain from Freenom: https://www.freenom.com
2. Use it for API only
3. Example: `event-api.tk` → `https://event-api.tk`

## Option 3: Use Vercel Domain Subdomain (If Possible)

Vercel doesn't allow subdomains of `.vercel.app` domains for external services.
You need a separate domain.

## Recommended: Free Domain + Cloudflare Tunnel

1. Get free domain: `yourapi.tk` (from Freenom)
2. Configure Cloudflare Tunnel route
3. Permanent URL: `https://yourapi.tk`



