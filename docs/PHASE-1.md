# Phase 1 Acceptance Checklist

## Foundation

- [x] React web application and Spring Boot API
- [x] PostgreSQL persistence and Redis cache/session services
- [x] Environment-driven provider configuration
- [x] Responsive user and admin shells
- [ ] Production HTTPS and custom domains
- [ ] CI/CD verification pipeline

## Authentication

- [x] Register, verify email and password login
- [x] Google and GitHub OAuth2
- [x] Forgot/reset password with OTP
- [x] Refresh rotation and fingerprint binding
- [x] Session restoration without storing access tokens in localStorage
- [x] Admin password plus OTP login
- [x] Admin role preserved after page refresh
- [x] Admin absolute session expiry preserved across rotations
- [x] Current-device and all-device logout

## Career Workspaces

- [x] Streaming career chat
- [x] Conversation create, search, rename, archive and delete
- [x] Resume PDF/DOCX parsing and ATS analysis
- [x] Job-description match and resume gap analysis
- [x] Resume conversation history and PDF generation
- [x] Live job search and apply links
- [x] AI image generation and history
- [ ] Visual resume builder with reusable ATS templates
- [ ] Cover letters
- [ ] Saved jobs and application tracker
- [ ] Interview and roadmap workspaces

## Commerce and Support

- [x] Wallet and transaction history
- [x] Configurable plans
- [x] Audience-aware promotions
- [x] Razorpay order, verification and signed webhook
- [x] Exactly-once settlement and downtime reconciliation
- [x] User support tickets and admin replies

## Admin Operations

- [x] Admin dashboard and protected routes
- [x] Paginated user projection query
- [x] Email/name search
- [x] Enable, disable, block, unblock and message user
- [x] Plan and promo management
- [x] Request traffic, latency, status and JVM monitoring
- [x] User request activity drill-down
- [x] Support inbox
- [ ] Persistent analytics and revenue trends
- [ ] Runtime feature-toggle enforcement
- [ ] Provider-specific health probes and alerts

## Performance Rules

- Access-token validation must not query PostgreSQL or Redis.
- List APIs must be paginated and return DTO projections.
- External provider calls must stay outside long database transactions.
- Remote data stores should be deployed in the API region.
- Dashboard polling must be bounded and inactive tabs must not fetch data.

## Exit Criteria

Phase 1 is releasable after HTTPS/custom domains, deployment secret rotation, production OAuth callback verification, Razorpay webhook verification and one end-to-end smoke run against the deployed environment.