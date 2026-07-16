# Production deployment

## 1. Supabase

1. Create a fresh Supabase project.
2. Keep anonymous sign-ins disabled. Email magic links are the baseline login method.
3. Run all files in `supabase/migrations` in filename order in the SQL editor, or link the CLI and run `supabase db push`.
4. Copy the project URL and public anon key. Never use the service-role key in this frontend.
5. In Authentication → URL Configuration set the production Site URL and add both the Vercel domain and `http://localhost:5173` as redirect URLs.
6. Optional: enable Google and Apple providers and enter their client credentials. Their callback URL is shown by Supabase in each provider's settings.

## 2. Local verification

```bash
cp .env.example .env.local
# Fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm test
npm run lint
npm run build
```

Open the application in two separate browser profiles. Create two permanent accounts, join the same league, create a game and verify that lobby assignments, draft picks and weekly results synchronize. Refresh and confirm that the game appears under the league again.

## 3. Vercel

Add these Production and Preview environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Deploy the repository. Vercel uses `vercel.json`, runs `npm run build` and serves `dist`.

## 4. Release checks

- `npm audit --omit=dev` reports no production vulnerabilities.
- Email magic-link sign-in works on the deployed domain.
- Enabled Google/Apple providers return to the deployed app successfully.
- A returning account sees its leagues and active season games.
- A non-member cannot select a game or its members through the Supabase API.
- Two simultaneous updates do not silently overwrite one another.
- Refreshing both local and online games restores a valid state.
- `/preview.html` opens and receives the expected state for the chosen mode.
