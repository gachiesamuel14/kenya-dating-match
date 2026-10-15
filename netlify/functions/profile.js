import { getUser } from '@netlify/identity';
import { getDatabase } from '@netlify/database';

export default async (req, context) => {
  const user = await getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const db = getDatabase();

  if (req.method === 'GET') {
    const rows = await db.sql`SELECT * FROM profiles WHERE user_id = ${user.id}`;
    return Response.json(rows[0] || null);
  }

  if (req.method === 'POST') {
    const data = await req.json();
    const { name, age, bio, county, tribe, religion, interests, lat, lng } = data;
    await db.sql`
      INSERT INTO profiles (user_id, name, age, bio, county, tribe, religion, interests, lat, lng)
      VALUES (${user.id}, ${name}, ${age}, ${bio}, ${county}, ${tribe}, ${religion}, ${interests}, ${lat}, ${lng})
      ON CONFLICT (user_id) DO UPDATE SET
        name = EXCLUDED.name,
        age = EXCLUDED.age,
        bio = EXCLUDED.bio,
        county = EXCLUDED.county,
        tribe = EXCLUDED.tribe,
        religion = EXCLUDED.religion,
        interests = EXCLUDED.interests,
        lat = EXCLUDED.lat,
        lng = EXCLUDED.lng,
        updated_at = NOW()
    `;
    return Response.json({ success: true });
  }

  return new Response('Method not allowed', { status: 405 });
};

export const config = { path: '/api/profile' };
