import { getUser } from '@netlify/identity';
import { getDatabase } from '@netlify/database';

export default async (req, context) => {
  const user = await getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const db = getDatabase();
  const rows = await db.sql`
    SELECT id, name, age, bio, county, tribe, religion, interests, lat, lng
    FROM profiles
    WHERE user_id != ${user.id} AND lat IS NOT NULL AND lng IS NOT NULL
    ORDER BY updated_at DESC
    LIMIT 50
  `;
  return Response.json(rows);
};

export const config = { path: '/api/nearby' };
