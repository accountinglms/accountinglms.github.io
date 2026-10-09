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


## Authenticator / TOTP MFA

The LMS supports verified TOTP factors through Supabase Auth. Compatible apps include Google Authenticator, Authy, 1Password and other apps that support standard `otpauth://` TOTP credentials.

Enrollment flow:

1. authenticated user opens `account.html`;
2. LMS requests a new TOTP factor from Supabase Auth;
3. Supabase returns an unverified factor with QR SVG, secret and authenticator URI;
4. the user scans the QR (or enters the secret manually);
5. LMS creates a factor challenge and verifies the 6-digit code;
6. Supabase returns a new `aal2` session and the factor becomes verified.

Login flow after TOTP is enabled:

1. email + password creates an `aal1` session;
2. the LMS checks database access flags and detects that a verified factor exists;
3. learner access remains blocked by RLS until TOTP is verified;
4. user enters the 6-digit Authenticator code;
5. successful challenge/verify returns an `aal2` session;
6. LMS content and Admin access are unlocked.

Authorization is MFA-aware at the database layer. `private.is_allowed_user()` and `private.is_editor()` require `aal2` whenever the current user owns at least one verified MFA factor. The browser UI is therefore not the sole security boundary.

Multiple verified TOTP factors are supported so a user can keep a backup Authenticator on another trusted app/device. The login challenge lets the user select a factor when more than one is present.

Email password recovery does not remove verified MFA factors. Losing all Authenticator access requires an owner/support recovery procedure; users should keep a second trusted factor when practical.

## Phone verification

The Account page reserves a phone identity/status area but does not treat an unverified phone number as a security factor. SMS recovery/MFA remains disabled until a supported SMS provider is intentionally configured.
