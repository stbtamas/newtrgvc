# TRGVC Cloudflare community beta

This branch adapts the community prototype to the existing stbtamas/newtrgvc repository. The original website remains at `/`; its navigation now links to `/community/`. The new community is an installable web app, not an Android APK or iOS binary.

## Current status

Implemented locally; not pushed or deployed. No live beta URL exists yet. The default Worker name is `newtrgvc-beta`, deliberately separate from the existing `newtrgvc` production service. Do not merge this branch to main or change the existing production build until the beta is configured and reviewed.

The old Sites/ChatGPT authentication dependency has been removed. This version uses Supabase email-code authentication, Cloudflare D1 for community data, and R2 for avatars. No real account service, database, bucket or email provider has been created by this change.

## What is included

Profiles with custom avatars, names, handles and bios; official updates; videos; music releases; comments; likes; favourites; Crew Night RSVPs/polls; squads; member directory; blocking/reporting; moderator tools; scheduled creator posts; draft YouTube imports; search; activity; account help/deletion; accessibility and offline reading.

The same authenticated Supabase user ID identifies a member across the browser and installed web app. Production and beta must use deliberately selected environments. Do not assume beta records appear on the current public website, or create an unrelated account database for future native apps.

## Configure the beta once

1. Connect GitHub access for the `stbtamas/newtrgvc` repository and push the `community-beta` branch. This branch has not been pushed by the assistant.
2. Create a separate Cloudflare Worker named `newtrgvc-beta` using that branch. Set build command to `npm run build`, deploy command to `npm run deploy`, root directory `/`. Keep the existing production Worker unchanged. Existing non-production version builds on the original Worker are not the intended beta environment.
3. In an authenticated local terminal, run `pnpm install --frozen-lockfile`, then `npx wrangler d1 create newtrgvc-beta-db` and `npx wrangler r2 bucket create newtrgvc-beta-avatars`. R2 account activation may be required.
4. Pass the real returned database UUID to `node scripts/configure-storage.mjs DATABASE_UUID`. Commit the resulting configuration. The helper does not fabricate an ID or create resources.
5. Run `npm run db:migrate` once to apply the migrations to the selected beta database. Future runs use the migration history.
6. Create a Supabase project for beta authentication. Enable email-code sign-in, and change its email template to include `{{ .Token }}` as the code. Configure email delivery/SMTP for the intended testers. Default provider email sending restrictions must be checked before inviting people.
7. Set the Cloudflare Worker runtime variables `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` to the beta project values. A Supabase service-role key is NOT needed and must not be put into this app's client bundle.
8. Sign in and obtain your verified Supabase user UUID from its user dashboard. Set `OWNER_USER_IDS` to that UUID. Optional moderator UUIDs go in `MODERATOR_USER_IDS`. Values are comma-separated; roles are enforced by server code. Never make the first signup an admin.
9. Optional: set server runtime secret `YOUTUBE_API_KEY` and variable `YOUTUBE_CHANNEL_ID`. Imports stay as drafts until the creator approves them.
10. Deploy the beta, then verify two separate accounts: profile persistence, private favourites, comment/report flow, moderator access, avatar upload and deletion. Test on the Android phone before sharing a wider invite.

Cloudflare variables above are runtime configuration, not just build variables. Use its Variables and Secrets settings or `wrangler secret put NAME` from an authenticated terminal. Do not paste secrets into chat or commit them. Supabase authentication still needs configuring even when the frontend preview loads.

## Local commands

- `pnpm install --frozen-lockfile`: install the lockfile dependencies.
- `npm run build`: compile the community and copy the existing public site into dist.
- `npm run check`: TypeScript checks.
- `npm test`: actual API/SQL permission tests with local substitutes for D1, R2 and Supabase upstream responses.
- `npx wrangler deploy --dry-run`: compile the Worker without publishing.
- `npm run preview`: local Worker preview after a build. For functional local login configure local bindings and `.dev.vars`, and use HTTPS because sessions use a Secure cookie. Local preview without bindings displays a clear configuration message.
- `npm run deploy`: verifies storage configuration, then deploys to the configured beta Worker.

Do not use the earlier Sites source ZIP for this Cloudflare deployment. This branch replaces it for this hosting target.

## Authentication and current beta limits

The server verifies the session with Supabase on authenticated requests. Session tokens are in Secure, HttpOnly, SameSite=Lax cookies and are never stored in browser localStorage. Writes check the request Origin. Login attempts have IP/email throttling; Supabase controls OTP validity and delivery. Sessions last at most one hour; refresh-token rotation is intentionally not implemented yet. Users request another code after expiry. Add long-lived session renewal before broader release.

Logout clears this browser's cookie. It does not revoke every other device session. Delete community account removes D1 community records and the R2 avatar; the Supabase authentication record is separately retained. Full identity deletion currently requires a verified operator request, as explained in the UI. Public launch needs complete identity deletion automation and final privacy/retention arrangements.

The Worker URL is not automatically private. Configure an appropriate beta audience/access gate before inviting testers if private access is required. Do not describe a publicly reachable workers.dev URL as owner-private.

YouTube refresh runs on demand or every 15 minutes while creator tools are open; no background scheduled job is configured. Push notifications are not implemented. Quiet-hour preferences are stored only. Native iOS/Android clients, badges/rewards, richer onboarding and other unlisted wishlist items remain future work. Data lists are bounded; production pagination, broader abuse protection and backup/restore operations remain work.

Local automated tests passed for permissions, SQL data isolation, authentication boundary, OTP cookies, rate limits and routing. Frontend build and Worker dry-run succeeded. The local Worker preview hit an environment network-interface error, so browser/device end-to-end validation remains required on the hosted beta. Supabase email delivery and real cross-device sign-in have not been exercised.

## Website integration after beta

Keep the original design and Community entry. Once reviewed, select the production auth/storage environment, assign roles, migrate data deliberately if needed, and configure the production Worker to serve the same `/community/` routes. Future native clients should use that same account identity and backend with an appropriate native session flow. Do not copy cookie tokens into native app storage as a shortcut.

References: https://developers.cloudflare.com/workers/static-assets/ and https://supabase.com/docs/guides/auth/auth-email-passwordless
