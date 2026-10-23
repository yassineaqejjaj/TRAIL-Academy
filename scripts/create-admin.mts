/**
 * Grants the admin role to an existing account (sign up on the site and confirm the e-mail first).
 *   npm run admin:create -- instructor@example.com
 */
import pg from "pg";

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !process.env.DATABASE_URL) { console.error("usage: DATABASE_URL=… npm run admin:create -- <email>"); process.exit(1); }
const ssl = process.env.DATABASE_SSL === "require" ? { rejectUnauthorized: false } : undefined;
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl });
await client.connect();
try {
  const res = await client.query("insert into user_roles (user_id, role) select id, 'admin' from auth.users where email = $1 on conflict do nothing returning user_id", [email]);
  const exists = (await client.query("select 1 from auth.users where email = $1", [email])).rowCount;
  console.log(!exists ? `no account with e-mail ${email}` : res.rowCount ? `${email} is now an administrator` : `${email} was already an administrator`);
} finally {
  await client.end();
}
