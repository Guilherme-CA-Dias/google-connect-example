import { NextRequest, NextResponse } from 'next/server'
import { generateMembraneTokenServer } from '@/lib/membrane-token'

// Membrane API endpoints
// According to docs: https://docs.getmembrane.com
const MEMBRANE_CONNECT_ENDPOINT = 'https://api.getmembrane.com/connect'
const MEMBRANE_OAUTH_CALLBACK = 'https://api.getmembrane.com/oauth-callback'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const token = await generateMembraneTokenServer()

    // Use Membrane's OAuth callback URL
    const redirectUri = body.redirectUri || MEMBRANE_OAUTH_CALLBACK

    // Prepare the payload object (will be stringified)
    const payload: Record<string, any> = {
      redirectUri: redirectUri,
    }
    
    // Use integrationKey (the one listed in integrations)
    if (body.integrationKey) {
      payload.integrationKey = body.integrationKey
    } else if (body.integrationId) {
      // Fallback to integrationId if key is not provided
      payload.integrationId = body.integrationId
    }
    
    if (body.input && Object.keys(body.input).length > 0) {
      payload.input = body.input
    }
    
    if (body.connectionId) {
      payload.connectionId = body.connectionId
    }
    
    if (body.name) {
      payload.name = body.name
    }
    
    if (body.authOptionKey) {
      payload.authOptionKey = body.authOptionKey
    }
    
    if (body.allowMultipleConnections) {
      payload.allowMultipleConnections = body.allowMultipleConnections
    }
    
    if (body.customState) {
      payload.customState = body.customState
    }

    // Make POST request to Membrane's /connect endpoint
    // The endpoint expects form-encoded data with a 'payload' field containing JSON string
    const payloadString = JSON.stringify(payload)
    console.log('Payload string:', payloadString)
    console.log('Payload type:', typeof payloadString)
    
    const formData = new URLSearchParams()
    formData.append('payload', payloadString)
    
    const formBody = formData.toString()
    console.log('Form body:', formBody)
    
    const response = await fetch(MEMBRANE_CONNECT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${token}`,
      },
      body: formBody,
    })

    const contentType = response.headers.get('content-type') || ''
    
    // If response is HTML (OAuth page), redirect user to the connect endpoint
    // Build the connect URL with query parameters for browser redirect
    const params = new URLSearchParams()
    
    if (body.integrationKey) {
      params.append('integrationKey', body.integrationKey)
    } else if (body.integrationId) {
      params.append('integrationId', body.integrationId)
    }
    
    if (body.input && Object.keys(body.input).length > 0) {
      params.append('input', JSON.stringify(body.input))
    }
    
    if (body.connectionId) {
      params.append('connectionId', body.connectionId)
    }
    
    if (body.name) {
      params.append('name', body.name)
    }
    
    if (body.authOptionKey) {
      params.append('authOptionKey', body.authOptionKey)
    }
    
    if (body.allowMultipleConnections) {
      params.append('allowMultipleConnections', 'true')
    }
    
    if (body.customState) {
      params.append('customState', body.customState)
    }
    
    params.append('token', token)
    params.append('redirectUri', redirectUri)
    
    const connectUrl = `${MEMBRANE_CONNECT_ENDPOINT}?${params.toString()}`

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Error from Membrane API - Status:', response.status)
      console.error('Error from Membrane API - Body:', errorText)
      
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { message: errorText || response.statusText }
      }
      
      return NextResponse.json(
        { error: errorData.message || 'Failed to create connection', details: errorData },
        { status: response.status }
      )
    }
    
    // If response is HTML (OAuth page), return the HTML content
    if (contentType.includes('text/html')) {
      const htmlContent = await response.text()
      console.log('Received HTML response, returning HTML content')
      // Return HTML content with proper headers
      return new NextResponse(htmlContent, {
        headers: {
          'Content-Type': 'text/html',
        },
      })
    }
    
    // Try to parse as JSON
    const responseText = await response.text()
    let result
    try {
      result = JSON.parse(responseText)
    } catch {
      // If not JSON and not HTML, still redirect to connect URL
      console.log('Response is not JSON, redirecting to connect URL')
      return NextResponse.json({ redirectUrl: connectUrl })
    }
    
    // If the response contains a redirect URL, return it
    if (result.redirectUrl || result.url) {
      return NextResponse.json({ redirectUrl: result.redirectUrl || result.url })
    }
    
    // Otherwise, redirect to connect URL
    return NextResponse.json({ redirectUrl: connectUrl })
  } catch (error: any) {
    console.error('Error creating connection:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { error: 'Failed to create connection', details: error.message },
      { status: 500 }
    )
  }
}
