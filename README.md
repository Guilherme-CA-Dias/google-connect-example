# Membrane Google Integration

A simple Next.js application that allows users to connect their Google account using Membrane's integration platform.

## Features

- Connect to Google (and other integrations) via Membrane
- View active connections
- Reconnect disconnected integrations
- Delete connections

## Setup

1. **Install dependencies:**

```bash
npm install
```

2. **Configure environment variables:**

Create a `.env.local` file in the root directory with your Membrane credentials:

```
MEMBRANE_WORKSPACE_KEY=your_workspace_key_here
MEMBRANE_WORKSPACE_SECRET=your_workspace_secret_here
```

You can find these values in your Membrane workspace settings.

3. **Run the development server:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How it works

1. **Backend Token Generation**: The `/api/membrane-token` endpoint generates JWT tokens using your workspace key and secret. These tokens identify users in Membrane.

2. **Direct API Integration**: The app uses direct HTTP requests to Membrane's API to:
   - List available integrations
   - Submit connection forms to Membrane's `/connect` endpoint
   - Display and manage connections

3. **Connection Flow**: When a user clicks "Connect", a form is submitted to Membrane's `/connect` endpoint, which opens a popup window that guides users through OAuth authentication. The popup sends connection information back to the parent window via `postMessage` events.

## Project Structure

- `app/api/membrane-token/route.ts` - Backend API endpoint for generating JWT tokens
- `app/api/oauth-callback/route.ts` - OAuth callback handler that processes redirects and sends postMessage
- `app/page.tsx` - Main page component with integration and connection management
- `components/ConnectionDialog.tsx` - Custom connection dialog with form submission
- `lib/membrane-api.ts` - Direct API functions for Membrane endpoints
- `lib/membrane-token.ts` - Server-side token generation utility
- `app/globals.css` - Global styles

## Notes

- User IDs are automatically generated and persisted in cookies to maintain session across page navigations.
- Make sure you have a Google integration configured in your Membrane workspace before testing.
- Token expiration is set to 2 hours (7200 seconds) by default.
- This implementation uses direct API calls instead of the Membrane SDK. See `CONNECTION_FLOW.md` for details.