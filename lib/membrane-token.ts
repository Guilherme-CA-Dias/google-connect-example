import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

// Server-side token generation (for API routes)
export async function generateMembraneTokenServer(): Promise<string> {
  const workspaceKey = process.env.MEMBRANE_WORKSPACE_KEY
  const workspaceSecret = process.env.MEMBRANE_WORKSPACE_SECRET

  if (!workspaceKey || !workspaceSecret) {
    throw new Error('Membrane workspace credentials not configured')
  }

  const cookieStore = await cookies()
  let userId = cookieStore.get('membrane_user_id')?.value

  if (!userId) {
    userId = crypto.randomUUID()
  }

  const userName = userId

  const tokenData = {
    workspaceKey: workspaceKey,
    id: userId,
    name: userName,
    fields: {},
  }

  const options = {
    expiresIn: 7200, // 2 hours
    algorithm: 'HS512' as const,
  }

  return jwt.sign(tokenData, workspaceSecret, options)
}
