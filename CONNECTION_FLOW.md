# Connection Flow - Step by Step

This document explains the API requests made when connecting to Google Drive using Membrane's auth-proxy authentication method.

## Prerequisites

- JWT token generated with `MEMBRANE_WORKSPACE_KEY` and `MEMBRANE_WORKSPACE_SECRET`
- Integration key: `google-drive`

---

## Step 1: Get Integration Details

**SDK Call:**
```typescript
const integrationData = await membrane.integration("google-drive").get()
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

**What happens:**
- Extract `authOptions` array
- Select auth option: `auth-proxy`
- Note: `auth-proxy` has no `inputSchema`, so no form fields needed

---

## Step 2: Create Connection

**SDK Call:**
```typescript
const result = await membrane.integration("google-drive").connect({
  authOptionKey: "auth-proxy"
})
```

**Response:**
```json
{
  "id": "connection-id-123",
  "name": "Google Drive Connection",
  "userId": "user-id-456",
  "integrationId": "69b43ec79d3a27a5f93cef68",
  "disconnected": false,
  "clientAction": {
    "type": "connect",
    "description": "Redirecting to Google for authorization",
    "uiUrl": "https://membrane.io/oauth/google-drive?connectionId=connection-id-123"
  }
}
```

**What happens:**
- Connection object created
- Response contains `clientAction.uiUrl` for OAuth redirect
- User must be redirected to `clientAction.uiUrl` to complete authorization

---

## Step 3: Handle OAuth Redirect

**Process:**
1. Redirect user to `clientAction.uiUrl`
2. User authorizes on Google's OAuth page
3. Google redirects back to Membrane's callback URL
4. Membrane processes authorization and completes connection

**OAuth Flow:**
```
Your App → Redirect to clientAction.uiUrl
              ↓
         Google OAuth Page
              ↓
    User Authorizes
              ↓
    Google Callback → Membrane
              ↓
    Connection Complete
```

---

## Step 4: Verify Connection Status

**SDK Call:**
```typescript
const connection = await membrane.connection(connectionId).get()
```

**Response:**
```json
{
  "id": "connection-id-123",
  "name": "Google Drive Connection",
  "userId": "user-id-456",
  "integrationId": "69b43ec79d3a27a5f93cef68",
  "disconnected": false,
  "state": "active",
  "lastActiveAt": "2024-01-15T10:30:00Z"
}
```

**What happens:**
- Check `disconnected: false` means connection is active
- Connection ready to use

---

## Complete Flow

```
1. membrane.integration("google-drive").get()
   → Returns integration with authOptions
   
2. Extract auth-proxy option (no inputSchema needed)
   
3. membrane.integration("google-drive").connect({ authOptionKey: "auth-proxy" })
   → Returns connection with clientAction.uiUrl
   
4. Redirect user to clientAction.uiUrl
   → Google OAuth page
   → User authorizes
   → Google callback → Membrane completes connection
   
5. membrane.connection(connectionId).get()
   → Verify connection is active
```

---

## Error Responses

### Integration Not Found
```json
{
  "error": "Integration not found",
  "code": "INTEGRATION_NOT_FOUND"
}
```

### Invalid Auth Option
```json
{
  "error": "Invalid auth option key",
  "code": "INVALID_AUTH_OPTION"
}
```

### Connection Failed
```json
{
  "error": "Connection failed",
  "code": "CONNECTION_FAILED"
}
```

---

## Notes

- **auth-proxy type:** Uses OAuth2 flow, no form fields required
- **OAuth redirect:** Must redirect user to `clientAction.uiUrl` from connect response
- **Connection ID:** Use the `id` from connect response to verify status
- **Token expiration:** JWT tokens expire (typically 2 hours), refresh before expiration
