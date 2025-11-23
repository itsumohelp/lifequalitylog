import type { NextRequest } from 'next/server'
import { version } from 'os'
 
export async function GET(_req: NextRequest) {
  return Response.json({ name: 'lifequalitylog', version: '0.0.2' })
}