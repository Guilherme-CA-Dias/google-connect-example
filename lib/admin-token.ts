import jwt from 'jsonwebtoken'

export async function generateAdminToken(): Promise<string> {
  const workspaceKey = process.env.MEMBRANE_WORKSPACE_KEY
  const workspaceSecret = process.env.MEMBRANE_WORKSPACE_SECRET

  if (!workspaceKey || !workspaceSecret) {
    throw new Error('Membrane workspace credentials not configured')
  }

  const tokenData = { isAdmin: true }
  const options = {
    issuer: workspaceKey,
    expiresIn: 7200,
    algorithm: 'HS512' as jwt.Algorithm,
  }

  return jwt.sign(tokenData, workspaceSecret, options)
}
