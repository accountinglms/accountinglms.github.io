# Authentication and account recovery

## Persistent sign-in

The LMS does not store the user's raw password.

After a successful sign-in, the Supabase session (access token, refresh token and verified user metadata) is stored in browser local storage under `icaew-lms-auth-v2`.

On the next visit:

1. the stored session is loaded;
2. an expired/near-expiry access token is refreshed using the refresh token;
3. database-backed access roles are checked again;
4. the user enters the LMS without retyping credentials.

A user will need to sign in again after explicit logout, browser/site-data deletion, private browsing, revoked/invalid refresh tokens, or another authentication failure.

The last successful email address is stored separately only to prefill the login/recovery form. No password is stored by LMS code. Browser password managers such as iCloud Keychain remain responsible for optional password saving.

## Password recovery

The login page provides a **Quên mật khẩu?** flow:

1. user enters the account email;
2. the frontend calls Supabase Auth `/auth/v1/recover` with the canonical GitHub Pages URL as the redirect;
3. the UI always shows a generic success response to reduce account enumeration;
4. the email recovery link returns to the LMS;
5. the recovery access token is verified through `/auth/v1/user`;
6. the account is checked against LMS database access roles;
7. the user enters and confirms a new password;
8. the password is updated through the authenticated Supabase user endpoint;
9. the verified session continues into the workspace.

The UI includes a 60-second resend cooldown to match the recovery-email rate limit behavior.

## Security notes

- Recovery email is sent only by Supabase Auth; the LMS does not operate its own OTP database.
- Recovery callbacks are removed from the browser URL after successful parsing.
- Unauthorized Supabase users cannot enter the LMS because database-backed access checks still apply.
- Public responses do not confirm whether an email address exists.
