# Deploying Ticket V1 on Vercel

1. Import the GitHub repository as a Next.js project.
2. Set Production environment variables: MONGODB_URI, LINE_CHANNEL_SECRET, LINE_CHANNEL_ACCESS_TOKEN, DASHBOARD_USER, DASHBOARD_PASSWORD.
3. Set AUTH_SECRET to a randomly generated value of at least 32 bytes (recommended). If omitted, sessions use a key derived from the dashboard credentials. Password changes invalidate existing sessions.
4. Set APP_ORIGIN to the production HTTPS origin for documentation and external integrations. Write endpoints validate the actual request origin, so localhost settings do not block production forms.
5. Redeploy after environment variable changes.

MONGODB_URI must point to a reachable database such as MongoDB Atlas, including the desired database name (ticket_v1). A localhost/127.0.0.1 URI points to the Vercel function itself, not the Windows machine. Configure Atlas credentials and network access for the deployment. Existing local data, guide images, and database indexes must be migrated separately; deploying code does not upload the database.

Login is at /login. Protected pages redirect there; protected APIs return JSON 401 without browser Basic authentication prompts. Sessions use HttpOnly, SameSite=Lax cookies, Secure on HTTPS, with an 8-hour expiry. Logout clears the browser cookie. Login throttling is per running instance; configure Vercel Firewall rate limiting for distributed enforcement.

Set LINE Webhook URL to https://ticket-v1.vercel.app/api/webhook/line only after verifying the production database and webhook response. Do not turn off the existing working webhook until production is ready.
