# Custom Connection Flow - API Requests Guide

This document explains the API requests and Membrane SDK calls made during a custom connection flow when connecting to an integration (like Google) using Membrane.

## Overview

Instead of using Membrane's built-in `openNewConnection()` popup, a custom connection flow allows you to:
- Build your own UI for the connection process
- Dynamically render form fields based on the integration's auth schema
- Have full control over the user experience
- Handle the connection process programmatically

This guide focuses on the **API requests and SDK calls** made during the connection process, not the UI implementation.

---

## Prerequisites

Before making connection requests, you need:

1. **Authentication Token:** A JWT token that identifies the user/workspace
   - Generated using your `MEMBRANE_WORKSPACE_KEY` and `MEMBRANE_WORKSPACE_SECRET`
   - Contains user ID, workspace key, and expiration

2. **Integration Key/ID:** The identifier for the integration you want to connect to

---

## Step-by-Step API Flow

### Step 1: Get Integration Details

**Purpose:** Retrieve the integration information including available authentication options and their schemas.

**SDK Call:**
```typescript
const membrane = new MembraneClient({
  fetchToken: async () => {
    // Fetch JWT token from your backend
    const response = await fetch('/api/membrane-token')
    const { token } = await response.json()
    return token
  }
})

const integrationAccessor = membrane.integration(integrationKey)
const integrationData = await integrationAccessor.get()
```

**HTTP Request:**
```
GET /api/integrations/{integrationKey}
Authorization: Bearer {jwt_token}
```

**Request Headers:**
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Response Structure:**
```json
{
  "id": "integration-id-123",
  "name": "Google",
  "key": "google",
  "logoUri": "https://...",
  "description": "Connect your Google account",
  "authOptions": [
    {
      "key": "oauth2",
      "type": "oauth2",
      "title": "OAuth 2.0",
      "description": "Sign in with Google",
      "inputSchema": {
        "type": "object",
        "properties": {
          "apiKey": {
            "type": "string",
            "title": "API Key",
            "description": "Your API key"
          },
          "region": {
            "type": "string",
            "title": "Region",
            "enum": ["us", "eu", "asia"]
          }
        },
        "required": ["apiKey"]
      },
      "ui": {
        "schema": {},
        "helpUri": "https://docs.example.com"
      }
    }
  ]
}
```

**Key Response Fields:**
- `authOptions`: Array of available authentication methods
- `authOptions[].key`: Unique identifier for the auth method
- `authOptions[].type`: Auth type (`oauth2`, `oauth1`, `proxy`, `client-credentials`, etc.)
- `authOptions[].inputSchema`: JSON Schema defining required form fields
- `authOptions[].inputSchema.properties`: Object defining each field
- `authOptions[].inputSchema.required`: Array of required field keys

**Notes:**
- If `inputSchema` is `null` or empty, the auth method typically only requires OAuth authorization (no form fields)
- Multiple `authOptions` means the integration supports different authentication methods

---

### Step 2: Parse Input Schema (Client-Side)

**Purpose:** Extract form field definitions from the `inputSchema` to build a dynamic form.

**Process:**
1. Check if `inputSchema` exists
2. If it exists, iterate through `inputSchema.properties`
3. Extract field metadata:
   - Field key (property name)
   - Field type (`string`, `number`, `boolean`, etc.)
   - Field label (`title` or `label`)
   - Required status (check if key is in `required` array)
   - Description (if available)

**Schema Structure:**
```json
{
  "type": "object",
  "properties": {
    "fieldName": {
      "type": "string",
      "title": "Display Label",
      "description": "Help text",
      "default": "default value"
    }
  },
  "required": ["fieldName"]
}
```

**Common Field Types:**
- `string`: Text input
- `number`: Numeric input
- `boolean`: Checkbox
- `array`: Multi-select (if `items` is defined)
- `enum`: Dropdown select

**Example Parsed Fields:**
```javascript
[
  {
    key: "apiKey",
    label: "API Key",
    type: "string",
    required: true,
    description: "Your API key from the provider"
  },
  {
    key: "region",
    label: "Region",
    type: "string",
    required: false,
    description: "Select your region"
  }
]
```

---

### Step 3: Collect User Input (Client-Side)

**Purpose:** Gather form field values from the user.

**Process:**
- Render form fields based on parsed schema
- Collect user input for each field
- Validate required fields are filled
- Prepare input data object

**Input Data Structure:**
```json
{
  "apiKey": "sk-1234567890",
  "region": "us"
}
```

**Validation:**
- Check all `required` fields have values
- Validate field types (e.g., number fields contain numbers)
- Filter out empty/null/undefined values if not required

---

### Step 4: Create Connection

**Purpose:** Initiate the connection process with Membrane.

**SDK Call:**
```typescript
const result = await integrationAccessor.connect({
  authOptionKey: "oauth2",
  input: {
    apiKey: "sk-1234567890",
    region: "us"
  }
})
```

**HTTP Request:**
```
POST /api/integrations/{integrationKey}/connect
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "authOptionKey": "oauth2",
  "input": {
    "apiKey": "sk-1234567890",
    "region": "us"
  },
  "name": "My Connection Name",  // Optional
  "allowMultipleConnections": false  // Optional
}
```

**Request Parameters:**
- `authOptionKey` (required): The key of the auth option to use
- `input` (optional): Form field values if `inputSchema` requires them
- `name` (optional): Custom name for the connection
- `allowMultipleConnections` (optional): Whether to allow multiple connections for this integration

**Response Structure:**

**For OAuth Flows:**
```json
{
  "id": "connection-id-123",
  "name": "My Google Connection",
  "userId": "user-id-456",
  "integrationId": "integration-id-123",
  "disconnected": false,
  "clientAction": {
    "type": "connect",
    "description": "Redirecting to Google for authorization",
    "uiUrl": "https://membrane.io/oauth/google?connectionId=connection-id-123"
  }
}
```

**For API Key/Token Flows:**
```json
{
  "id": "connection-id-123",
  "name": "My API Connection",
  "userId": "user-id-456",
  "integrationId": "integration-id-123",
  "disconnected": false,
  "canTest": true
}
```

**Response Fields:**
- `id`: Connection identifier
- `name`: Connection name
- `userId`: User who created the connection
- `integrationId`: Associated integration
- `disconnected`: Connection status
- `clientAction`: For OAuth flows, contains redirect URL
- `canTest`: Whether connection can be tested

---

### Step 5: Handle OAuth Redirect (If Applicable)

**Purpose:** For OAuth flows, redirect user to provider's authorization page.

**Process:**
1. Check if response contains `clientAction.uiUrl`
2. If present, redirect user to that URL
3. User authorizes on provider's site
4. Provider redirects back to Membrane's callback URL
5. Membrane processes authorization and completes connection

**OAuth Flow:**
```
User → Your App → Membrane API → Provider OAuth Page
                                      ↓
User Authorizes ← Provider Callback ← Membrane Processes
                                      ↓
Connection Complete → Your App (via callback)
```

**Callback Handling:**
- Membrane handles the OAuth callback internally
- Your app can poll or use webhooks to detect connection completion
- Or use `sameWindow: true` with `redirectUri` to handle in your app

**Alternative: Popup Window**
```typescript
const result = await integrationAccessor.connect({
  authOptionKey: "oauth2",
  input: {},
  sameWindow: false  // Opens in popup
})
```

---

### Step 6: Verify Connection Status

**Purpose:** Check if connection was successfully created.

**SDK Call:**
```typescript
const connection = await membrane.connection(connectionId).get()
```

**HTTP Request:**
```
GET /api/connections/{connectionId}
Authorization: Bearer {jwt_token}
```

**Response:**
```json
{
  "id": "connection-id-123",
  "name": "My Connection",
  "userId": "user-id-456",
  "integrationId": "integration-id-123",
  "disconnected": false,
  "state": "active",
  "lastActiveAt": "2024-01-15T10:30:00Z",
  "integration": {
    "id": "integration-id-123",
    "name": "Google",
    "key": "google"
  }
}
```

**Status Fields:**
- `disconnected`: `false` means connection is active
- `state`: Connection state (`active`, `error`, `pending`, etc.)
- `lastActiveAt`: Last successful API call timestamp
- `error`: Error details if connection failed

---

### Step 7: List All Connections (Optional)

**Purpose:** Retrieve all connections for the current user.

**SDK Call:**
```typescript
const result = await membrane.connections.find()
const connections = result.items
```

**HTTP Request:**
```
GET /api/connections?userId={userId}
Authorization: Bearer {jwt_token}
```

**Query Parameters:**
- `userId` (optional): Filter by user ID
- `integrationKey` (optional): Filter by integration
- `disconnected` (optional): Filter by connection status
- `limit` (optional): Number of results
- `cursor` (optional): Pagination cursor

**Response:**
```json
{
  "items": [
    {
      "id": "connection-id-123",
      "name": "My Google Connection",
      "integrationId": "integration-id-123",
      "disconnected": false,
      "integration": {
        "name": "Google",
        "key": "google"
      }
    }
  ],
  "cursor": "next-page-cursor"
}
```

---

## Complete Request Flow

```
1. GET /api/integrations/{integrationKey}
   ↓
   Response: Integration with authOptions and inputSchema
   ↓
2. Parse inputSchema → Build form fields
   ↓
3. User fills form → Collect input data
   ↓
4. POST /api/integrations/{integrationKey}/connect
   Body: { authOptionKey, input }
   ↓
   Response: Connection object (may include clientAction.uiUrl for OAuth)
   ↓
5. (If OAuth) Redirect to clientAction.uiUrl
   ↓
   User authorizes → Provider callback → Membrane completes connection
   ↓
6. GET /api/connections/{connectionId}
   ↓
   Verify connection status
```

---

## Error Handling

### Integration Not Found
**Status:** `404 Not Found`
**Response:**
```json
{
  "error": "Integration not found",
  "code": "INTEGRATION_NOT_FOUND"
}
```

### Invalid Auth Option
**Status:** `400 Bad Request`
**Response:**
```json
{
  "error": "Invalid auth option key",
  "code": "INVALID_AUTH_OPTION"
}
```

### Missing Required Fields
**Status:** `400 Bad Request`
**Response:**
```json
{
  "error": "Missing required field: apiKey",
  "code": "VALIDATION_ERROR",
  "field": "apiKey"
}
```

### Invalid Credentials
**Status:** `401 Unauthorized`
**Response:**
```json
{
  "error": "Invalid API key",
  "code": "INVALID_CREDENTIALS"
}
```

### Connection Already Exists
**Status:** `409 Conflict`
**Response:**
```json
{
  "error": "Connection already exists",
  "code": "CONNECTION_EXISTS"
}
```

---

## Authentication Types

### OAuth 2.0 / OAuth 1.0
- **inputSchema:** Usually empty (no form fields)
- **Flow:** User redirected to provider for authorization
- **Response:** Contains `clientAction.uiUrl` for redirect

### API Key / Token
- **inputSchema:** Contains fields for API key, token, etc.
- **Flow:** Credentials validated immediately
- **Response:** Connection created synchronously

### Client Credentials
- **inputSchema:** Contains client ID and secret fields
- **Flow:** Token exchange happens server-side
- **Response:** Connection created after token exchange

### Proxy
- **inputSchema:** May contain proxy configuration fields
- **Flow:** Proxy setup configured
- **Response:** Connection ready for proxy requests

---

## Best Practices

1. **Always validate inputSchema:** Check if fields are required before showing form
2. **Handle OAuth redirects:** Check for `clientAction.uiUrl` in response
3. **Poll for completion:** For async OAuth flows, poll connection status
4. **Error handling:** Display user-friendly error messages
5. **Token management:** Ensure JWT tokens are refreshed before expiration
6. **Schema flexibility:** Handle different schema formats (JSON Schema, custom formats)

---

## Notes

- **OAuth Redirects:** Membrane handles OAuth callbacks internally. Your app may need to poll or use webhooks to detect completion.
- **Schema Formats:** `inputSchema` follows JSON Schema format, but may vary slightly between integrations.
- **Multiple Auth Options:** Some integrations support multiple auth methods. Let users choose which one to use.
- **Connection Naming:** You can provide a custom name, or Membrane will generate one automatically.
- **Token Expiration:** JWT tokens expire (typically 2 hours). Implement token refresh logic.
