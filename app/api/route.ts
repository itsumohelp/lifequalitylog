import prisma from '@/lib/prisma';
import type { NextRequest } from 'next/server'
 
export async function GET(_req: NextRequest) {
  const logs = await prisma.appLog.findMany()
  return Response.json({ name: 'lifequalitylog', version: '0.0.2' , logs})
}