# Runtime app version check

## Request

The root layout mounts one `AppVersionNotice`, so navigation between login, home, and quiz screens does not create duplicate checks.

The service sends a JSON POST to `https://passaexam.kinitify.com/functions/appManager`:

```json
{
  "mode": "GETVER",
  "value": "TXRHEXAMTOOLS",
  "user_id": "<existing domain user ID>",
  "password": "<existing domain password>"
}
```

The existing domain API configuration is shared in `constants/domainApi.ts`. Request logging uses the existing sanitizer and excludes the password.

## Behavior

- Check at startup, independently of authentication.
- Check again when the app returns to the foreground, with a minimum 60-second interval between attempts and no concurrent requests.
- Accept `VERSION` directly, in a nested data object, or in an array. Field names are case-insensitive; error replies and empty/malformed versions are rejected.
- Compare trimmed version strings for any difference, not only a numerically newer release.
- Installed native releases use their own `nativeApplicationVersion`. Expo/OnSpace/browser previews use the project-configured version instead of the preview host version.
- On mismatch, show a centered, scrollable version notice with both versions, a close control, and a continue button. Android Back also dismisses it.
- A dismissed installed/server version pair stays dismissed for this running session. A different server version may show a new notice; restarting the app permits a new notice.
- Matching versions show no notice. The footer remains the installed/configured version, never the server version.
- Timeout (20 seconds), offline, invalid JSON, HTTP failures, and missing VERSION do not block app access or show an update warning. A future foreground transition can retry.
- No automatic download, store redirect, forced upgrade, account change, or payment change is performed.

## Manual verification

1. Return the same VERSION as the footer: no notice should appear.
2. Return a different VERSION: verify the notice is centered and displays both values.
3. Close via the continue button, close icon, and Android Back; login/home/quiz should remain usable.
4. Navigate between screens and return to the foreground after 60 seconds: the same dismissed pair should not reappear during that session.
5. Change the server VERSION, then return to the foreground after the interval: a new mismatch may appear.
6. Test offline, HTTP errors, invalid JSON, and a missing VERSION: app startup and login must still work.
7. Test on an installed iOS/Android release, browser preview, a narrow phone, landscape, and each font size. Browser preview alone does not verify native application metadata or AppState transitions.
