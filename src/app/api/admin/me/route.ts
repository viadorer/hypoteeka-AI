import { getAdminUser, unauthorizedResponse } from '@/lib/admin/auth';

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return unauthorizedResponse();
  return Response.json({ admin });
}
