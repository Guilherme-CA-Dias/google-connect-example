# Connection Flow - Direct API Implementation

This document explains how to connect to integrations using Membrane's API directly, without using the SDK.

## Overview

The connection flow uses direct API calls and form submissions to Membrane's `/connect` endpoint. The OAuth flow happens in a popup window, and connection information is communicated back to the parent window via `postMessage`.

## Step-by-Step Flow

### Step 1: Get Integration Details

**API Call:**
```typescript
GET https://api.getmembrane.com/integrations/{integrationKey}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "id": "69b43ec79d3a27a5f93cef68",
  "name": "Google Drive",
  "key": "google-drive",
  "logoUri": "https://static.integration.app/connectors/gdrive/logo.png",
  "authType": "oauth2",
  "authOptions": [
    {
      "key": "auth-proxy",
      "type": "proxy",
      "title": "Auth Proxy"
    }
  ]
}
```

### Step 2: Generate User Token

**API Call:**
```typescript
GET /api/membrane-token
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9..."
}
```

The token is a JWT signed with your workspace secret and contains:
- `workspaceKey`: Your Membrane workspace key
- `id`: User ID (persisted in cookie)
- `name`: User name
- `fields`: Custom user fields

### Step 3: Prepare Connection Payload

Create a payload object with:
- `integrationId`: The integration ID from Step 1
- `authOptionKey`: The auth option key (e.g., "auth-proxy")
- `redirectUri`: Your callback URL (e.g., `https://your-domain.com/api/oauth-callback`)
- `input`: (Optional) Any additional input fields required by the integration

**Example:**
```json
{
  "integrationId": "69b43ec79d3a27a5f93cef68",
  "authOptionKey": "auth-proxy",
  "redirectUri": "https://your-domain.com/api/oauth-callback"
}
```

### Step 4: Submit Form to Membrane's Connect Endpoint

Create an HTML form and submit it to Membrane's `/connect` endpoint:

**Form Structure:**
```html
<form method="POST" action="https://api.getmembrane.com/connect?token={token}&integrationId={integrationId}" 
      enctype="application/x-www-form-urlencoded" target="membrane-connect">
  <input type="hidden" name="payload" value='{"integrationId":"...","authOptionKey":"auth-proxy","redirectUri":"..."}' />
</form>
```

**Note:** The `payload` input’s `value` is a **string** that contains **JSON** (i.e., what you’d get from `JSON.stringify(payload)`). The outer quotes are the HTML attribute string, and the inner content is JSON.

**JavaScript Implementation:**
```typescript
// Create form element
const form = document.createElement('form')
form.method = 'POST'
form.action = `https://api.getmembrane.com/connect?token=${token}&integrationId=${integrationId}`
form.enctype = 'application/x-www-form-urlencoded'
form.target = 'membrane-connect'

// Add payload input
const payloadInput = document.createElement('input')
payloadInput.type = 'hidden'
payloadInput.name = 'payload'
payloadInput.value = JSON.stringify(payload)
form.appendChild(payloadInput)

// Open popup window
const popup = window.open('', 'membrane-connect', 'width=600,height=700,scrollbars=yes,resizable=yes')

// Submit form
document.body.appendChild(form)
form.submit()
document.body.removeChild(form)
```

### Step 5: Handle OAuth Flow in Popup

The form submission opens a popup window that:
1. Shows OAuth authorization page
2. User authorizes the connection
3. Membrane redirects to your `redirectUri` (or default callback) with connection information

### Step 6: OAuth Callback Handler

**Option 1: Use Membrane's Default Callback**

Membrane's default callback URL (`https://api.getmembrane.com/oauth-callback`) already sends a `postMessage` to the parent window and closes the popup. You can use this by either:
- Not specifying a `redirectUri` in the payload, or
- Setting `redirectUri: "https://api.getmembrane.com/oauth-callback"`

**Option 2: Custom Callback (Optional)**

If you need custom handling, you can create your own callback endpoint that receives the redirect with query parameters:
- `connectionId`: (on success) The ID of the created connection
- `error`: (on error) Error message
- `errorData`: (on error) Additional error details

**Custom Callback Implementation:**

Your callback endpoint should return an HTML page that sends `postMessage` to the parent window:

```typescript
// app/api/oauth-callback/route.ts
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const connectionId = searchParams.get('connectionId')
  const error = searchParams.get('error')
  const errorData = searchParams.get('errorData')

  const html = `
    <!DOCTYPE html>
    <html>
      <head><title>Connecting...</title></head>
      <body>
        <script>
          (function() {
            const connectionId = ${connectionId ? `"${connectionId}"` : 'null'};
            const error = ${error ? `"${error}"` : 'null'};
            const errorData = ${errorData ? `"${errorData}"` : 'null'};
            
            if (window.opener) {
              if (error) {
                window.opener.postMessage({
                  error: error,
                  errorData: errorData
                }, '*');
              } else if (connectionId) {
                window.opener.postMessage({
                  connectionId: connectionId,
                  connection: { id: connectionId }
                }, '*');
              }
              window.close();
            } else {
              window.location.href = '/';
            }
          })();
        </script>
        <p>Connecting...</p>
      </body>
    </html>
  `

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  })
}
```

**Note:** If you use Membrane's default callback, you don't need to implement a custom callback endpoint. The default callback already handles sending `postMessage` and closing the popup.

### Step 7: Listen for postMessage Events

In your parent window, listen for `postMessage` events from the popup:

```typescript
useEffect(() => {
  const handleMessage = (event: MessageEvent) => {
    if (event.data && typeof event.data === 'object') {
      // Connection successful
      if (event.data.connectionId || event.data.connection) {
        console.log('Connection successful:', event.data)
        onSuccess()
        onClose()
        return
      }

      // Connection error
      if (event.data.error) {
        console.error('Connection error:', event.data.error)
        setError(event.data.error)
        return
      }
    }
  }

  window.addEventListener('message', handleMessage)
  return () => window.removeEventListener('message', handleMessage)
}, [])
```

## Complete Flow Summary

1. **User clicks "Connect"** → Dialog opens
2. **Load integration details** → `GET /api/integrations/{key}`
3. **Generate user token** → `GET /api/membrane-token`
4. **Create form with payload** → Stringified JSON in `payload` field
5. **Submit form to Membrane** → `POST https://api.getmembrane.com/connect?token=...&integrationId=...`
6. **Popup opens** → OAuth authorization page
7. **User authorizes** → Redirected to your callback URL
8. **Callback sends postMessage** → Connection info sent to parent window
9. **Popup closes** → Automatically closed by callback page
10. **Parent receives message** → Updates UI, closes dialog, refreshes connections

## Key Differences from SDK

- **No SDK dependency**: All calls are direct HTTP requests
- **Form-based submission**: Uses HTML form POST instead of fetch API
- **Popup window**: Opens in a named popup window instead of redirecting current page
- **postMessage communication**: Uses browser postMessage API instead of SDK callbacks
- **Manual token management**: Token is generated server-side and passed as query parameter

## Security Notes

- The token is passed as a query parameter in the form action URL
- The redirectUri should point to your own domain, not Membrane's
- Consider validating the postMessage origin for additional security
- User ID is persisted in cookies to maintain session across page navigations
