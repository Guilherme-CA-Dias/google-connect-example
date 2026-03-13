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

    // Generate a random UUID for each token request
    const userId = crypto.randomUUID()
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

    return NextResponse.json({ token })
  } catch (error) {
    console.error('Error generating Membrane token:', error)
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    )
  }
}
