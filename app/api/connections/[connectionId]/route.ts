import { NextRequest, NextResponse } from 'next/server'
import { generateAdminToken } from '@/lib/admin-token'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ connectionId: string }> }
) {
  try {
    const { connectionId } = await params
    const adminToken = await generateAdminToken()

    const response = await fetch(
      `https://api.integration.app/connections/${connectionId}?includeSecrets=true`,
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch connection: ${response.statusText}`)
    }

    const connectionData = await response.json()
    return NextResponse.json(connectionData)
  } catch (error) {
    console.error('Error fetching connection:', error)
    return NextResponse.json(
      { error: 'Failed to fetch connection credentials' },
      { status: 500 }
    )
  }
}
