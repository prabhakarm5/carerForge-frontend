# Production Frontend Handoff

## Required deployment variables

```env
VITE_API_BASE_URL=https://your-public-backend.example
VITE_SUPPORT_EMAIL=support@your-domain.example
```

`VITE_API_BASE_URL` must be the HTTPS backend origin that also owns the OAuth callback endpoints. It must not point to an HTTP Elastic Beanstalk URL.

## Public review pages

The home footer exposes the pages required for a clear customer and payment flow:

- Terms: `/terms`
- Privacy: `/privacy-policy`
- Payment and refund policy: `/payment-policy`
- Contact and Support: `/contact`
- Digital delivery: `/delivery-policy`
- Pricing: `/#pricing`

Before a payment-provider review, set `VITE_SUPPORT_EMAIL` to an actively monitored address. Do not place API keys, webhook secrets, OAuth client secrets, refresh tokens, or private keys in the frontend build.

## Session behavior

The application keeps the access token in memory and uses HttpOnly refresh and fingerprint cookies. A temporary backend/network failure shows a reconnecting state and does not erase the local session. In production, the backend must use `SameSite=None` and `Secure=true` because the CloudFront application and API are different browser origins.

## Verification checklist

1. Use an incognito window to sign in and refresh twice.
2. Confirm GitHub and Google redirect to HTTPS callback URLs.
3. Verify the public policy routes without signing in.
4. Test checkout in Razorpay test mode and confirm wallet/history update after signed verification or webhook delivery.
5. Check phone widths around 360px and desktop widths around 1440px.