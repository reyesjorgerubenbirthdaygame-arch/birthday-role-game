# Google OAuth Setup Guide

This guide explains how to enable Google sign-in for the Birthday Role Game.

---

## Overview

Google OAuth requires three things:
1. A Google Cloud Console project with OAuth 2.0 credentials
2. The Client ID and Secret pasted into the Supabase dashboard
3. The Supabase callback URI added to the allowed redirect URIs in Google Console

---

## Step 1 — Google Cloud Console

1. Go to [https://console.cloud.google.com](https://console.cloud.google.com) and sign in.
2. Create a new project (or select an existing one).
3. In the left menu go to **APIs & Services → OAuth consent screen**.
   - Choose **External** user type and click **Create**.
   - Fill in the required fields (App name, support email, developer contact email).
   - Add the scope `openid`, `email`, and `profile` if prompted (they are usually pre-selected).
   - Save and continue through the remaining screens. You do **not** need to publish the app to test — leave it in "Testing" mode and add your Gmail accounts as test users.
4. In the left menu go to **APIs & Services → Credentials**.
5. Click **+ CREATE CREDENTIALS → OAuth client ID**.
   - Application type: **Web application**
   - Name: e.g. `Birthday Game Supabase`
   - Under **Authorized redirect URIs** add:
     ```
     https://bjzhndfzoadixicujufr.supabase.co/auth/v1/callback
     ```
6. Click **Create**. Copy the **Client ID** and **Client Secret** shown in the dialog.

---

## Step 2 — Supabase Dashboard

1. Open [https://supabase.com/dashboard/project/bjzhndfzoadixicujufr/auth/providers](https://supabase.com/dashboard/project/bjzhndfzoadixicujufr/auth/providers).
2. Find **Google** in the provider list and click it to expand.
3. Toggle **Enable Sign in with Google** on.
4. Paste the **Client ID** and **Client Secret** from Step 1.
5. Click **Save**.

---

## Step 3 — Local / Vercel Environment Variables

No additional environment variables are needed for OAuth itself — the credentials live in Supabase. Your existing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are sufficient for the client-side flow.

---

## Redirect URI Reference

| Environment | Callback URI |
|---|---|
| Supabase (all environments) | `https://bjzhndfzoadixicujufr.supabase.co/auth/v1/callback` |

The app's own post-auth redirect (set in `GoogleButton.tsx`) is:
```
<your-origin>/auth/confirm
```
This is the same route already used by the email/password flow.

---

## Testing

1. Start the dev server: `npm run dev`
2. Click **Continuar con Google** on the login page.
3. You should be redirected to Google's consent screen.
4. After approval, Google redirects back to Supabase, which then redirects to `/auth/confirm`.
5. Check **Authentication → Users** in the Supabase dashboard to confirm the user was created with provider `google`.
