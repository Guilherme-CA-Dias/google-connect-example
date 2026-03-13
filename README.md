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

2. **Frontend SDK**: The app uses Membrane's JavaScript SDK to:
   - List available integrations
   - Open connection flows for users
   - Display and manage connections

3. **Connection Flow**: When a user clicks "Connect", Membrane opens a popup that guides them through OAuth authentication with Google.

## Project Structure

- `app/api/membrane-token/route.ts` - Backend API endpoint for generating JWT tokens
- `app/page.tsx` - Main page component with integration and connection management
- `lib/membrane.ts` - Membrane client initialization
- `app/globals.css` - Global styles

## Notes

- The demo uses a default user ID (`demo-user-1`). In production, you should get the user ID from your authentication system.
- Make sure you have a Google integration configured in your Membrane workspace before testing.
- Token expiration is set to 2 hours (7200 seconds) by default.
