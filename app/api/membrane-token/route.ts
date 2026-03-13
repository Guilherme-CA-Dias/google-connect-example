import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

export async function GET(request: NextRequest) {
  try {
    const workspaceKey = process.env.MEMBRANE_WORKSPACE_KEY
    const workspaceSecret = process.env.MEMBRANE_WORKSPACE_SECRET

    if (!workspaceKey || !workspaceSecret) {
      return NextResponse.json(
        { error: 'Membrane workspace credentials not configured' },
        { status: 500 }
      )
    }

    // Get or generate a persistent user ID from cookies
    // This ensures the same user ID is used across page navigations
    const cookies = request.cookies
    let userId = cookies.get('membrane_user_id')?.value
    
    if (!userId) {
      // Generate a new UUID if one doesn't exist
      userId = crypto.randomUUID()
    }
    
    const userName = userId // Use the same UUID as the name

    const tokenData = {
      workspaceKey: workspaceKey,
      id: userId,
      name: userName,
      fields: {
        // Add any custom fields you want to attach to the user
      },
    }

    const options = {
      expiresIn: 7200, // 2 hours
      algorithm: 'HS512' as const,
    }

    const token = jwt.sign(tokenData, workspaceSecret, options)

    // Create response with token
    const response = NextResponse.json({ token })
    
    // Set cookie to persist user ID (expires in 30 days)
    response.cookies.set('membrane_user_id', userId, {
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: false, // Allow client-side access if needed
      sameSite: 'lax',
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Error generating Membrane token:', error)
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    )
  }
}
