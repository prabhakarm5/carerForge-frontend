# CareerForge AI Frontend

React and Vite client for the CareerForge AI career workspace.

![CareerForge home](docs/screenshots/home.png)

## Product Surfaces

- Welcome workspace chooser after user login
- Career chat with streaming Markdown and HTML artifacts
- Resume analysis, ATS coaching, job matching, generation, and PDF download
- Human-style live interview room and written interview practice
- Cover letters, live jobs, image generation, wallet, payments, support, profile, and settings
- Separate admin console for users, plans, promotions, support, traffic, latency, and runtime health

## Frontend Architecture

```mermaid
flowchart TD
  Router[React Router] --> Guard[ProtectedRoute / AdminRoute]
  Guard --> Layout[DashboardLayout]
  Layout --> Pages[Lazy-loaded workspaces]
  Pages --> Services[Typed service modules]
  Services --> Axios[Axios interceptor]
  Axios --> API[Spring Boot API]
  Store[Zustand auth store] --> Guard
  Store --> Axios
  Events[Workspace events] --> Sidebar[History sidebar]
```

## Authentication In The Browser

```mermaid
sequenceDiagram
  participant Page
  participant Store
  participant API

  Page->>API: Login
  API-->>Store: Short-lived access token + user profile
  Store->>Store: Access token stays in memory
  API-->>Page: HttpOnly refresh and fingerprint cookies
  Page->>API: Bearer token requests
  Store->>API: Refresh near expiry, on foreground return, or after one real 401
  API-->>Store: Rotated access token
```

Only non-sensitive display profile data is cached in local storage. Access tokens are held in memory; refresh credentials are not readable by JavaScript.

## Login Destination

Normal users now open `/welcome` after password or OAuth login. The page is a functional workspace chooser, not a marketing landing page. Admin users continue to open `/admin/dashboard`.

![CareerForge login](docs/screenshots/login.png)

## Interview Experience

The interview setup supports:

- Job interview, campus placement, college admission, career switch, and general practice goals
- Student, early-career, mid-career, and senior candidates
- Any profession or course, not only software roles
- Optional company or college context
- Job-description PDF, PNG, JPG, and WebP upload with visible extraction progress
- Existing analyzed resume selection or direct resume upload
- Hindi, Hinglish, English, automatic language matching, and strict interviewer mode

The live room uses a full-frame interviewer video when `VITE_INTERVIEWER_IDLE_VIDEO_URL` and `VITE_INTERVIEWER_SPEAKING_VIDEO_URL` are configured. Its lightweight fallback keeps one professional portrait and applies subtle whole-frame motion; it does not paste duplicate jaw or mouth layers over the face. Output audio drives the speaking waveform and room accents. Candidate audio/video goes directly from the browser to Gemini Live through an ephemeral token, so the Spring Boot server does not proxy media frames. The client requests playback audio routing and exposes output-device selection when the browser supports it.

Performance controls:

- Interview, resume, jobs, support, and admin pages are lazy-loaded.
- Audio transcription updates are batched before React state updates.
- Video frames are compressed and sampled rather than streamed at camera frame rate.
- Conversation and resume streams buffer small deltas before rerendering Markdown.
- Search boxes use delayed requests instead of calling the backend for every keystroke.
- The session refresh loop pauses when the tab is inactive and uses backoff when the backend is unreachable.
- Text PDFs are extracted locally; scanned PDFs and images use the configured vision model only when needed.

## Responsive Layout

- Desktop uses a collapsible history sidebar and fixed top bar.
- Mobile uses a drawer sidebar and compact top bar that stays visible above the visual viewport.
- Public pages use the same fixed, compact navigation and reserve its height on every breakpoint.
- Chat and interview composers stay in flow, so the keyboard resizes content without pushing actions off-screen.
- Interview camera becomes picture-in-picture on mobile.
- Safe-area and keyboard inset variables are derived from `window.visualViewport`.
- Fixed workspaces use `minmax(0, 1fr)` and bounded dimensions to avoid horizontal overflow.

## API Service Boundary

Pages do not construct backend URLs directly. Calls are grouped under `src/services`, while endpoint paths live in `src/config/api`.

```mermaid
flowchart LR
  Component --> Service[Feature service]
  Service --> Axios[axiosInstance]
  Axios --> Token[In-memory access token]
  Axios --> Refresh[Single shared refresh lock]
  Axios --> Backend[REST / SSE API]
```

For SSE features, the client performs one authorized fetch, parses named events, batches chunks, and retries authorization once after a genuine 401.

## Screen Gallery

![Public product workspace gallery](docs/screenshots/home-features.png)

![Authenticated CareerForge walkthrough](docs/media/careerforge-walkthrough.gif)

<table>
  <tr>
    <td width="50%"><img alt="CareerForge welcome workspace" src="docs/screenshots/welcome.png"></td>
    <td width="50%"><img alt="CareerForge interview setup" src="docs/screenshots/interview-setup.png"></td>
  </tr>
  <tr>
    <td align="center">Authenticated workspace chooser</td>
    <td align="center">Interview setup with document context</td>
  </tr>
  <tr>
    <td width="50%"><img alt="CareerForge mobile interview" src="docs/screenshots/interview-mobile.png"></td>
    <td width="50%"><img alt="CareerForge login" src="docs/screenshots/login.png"></td>
  </tr>
  <tr>
    <td align="center">Mobile viewport and fixed action footer</td>
    <td align="center">User authentication</td>
  </tr>
</table>

## Local Development

Create `.env` from `.env.example`:

```env
VITE_API_BASE_URL=http://localhost:9092
```

Run:

```powershell
npm install
npm run dev
```

Production build:

```powershell
npm run build
```

Focused lint example:

```powershell
npx eslint src/pages/Interview src/pages/Welcome src/routes/AppRoutes.jsx
```

## Deployment

- `VITE_API_BASE_URL` must be the backend origin, without a frontend route suffix.
- Configure backend CORS with the exact deployed frontend origin.
- Serve the frontend over HTTPS before enabling production cookies, microphone, camera, OAuth, or payment flows.
- OAuth callback URLs point to the backend; OAuth success redirects point to the frontend.
- Never put provider secrets, JWT secrets, database credentials, Razorpay secrets, or Gemini keys in `VITE_*` variables.

## Media And Documentation Safety

Before committing screenshots or videos:

1. Use a demo account with fake data.
2. Hide email addresses, IP addresses, access tokens, payment IDs, API keys, and browser extension panels.
3. Do not record `.env`, terminal history, cloud consoles, database consoles, or network request headers.
4. Record authenticated flows against localhost or a dedicated staging environment.
5. Review every frame before publishing.

The committed walkthrough was captured from the running local frontend and backend after authentication, then reviewed to ensure credentials and secrets are not visible.


## Production handoff

Deployment variables, public payment-review pages, and the final session/OAuth checklist are documented in [docs/production-handoff.md](docs/production-handoff.md). Product screenshots and walkthrough media are indexed in [docs/README.md](docs/README.md).
