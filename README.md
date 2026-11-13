# LedgerVoid

A financial intelligence dashboard for exploring annual-report data. PDF text
is extracted in the browser. Relevant excerpts are sent to the configured AI
provider only after the user explicitly requests analysis. The API key stays
server-side.

Financial amounts are shown only when a report line includes a recognizable
financial label and an explicit currency or unit. Growth and margin
calculations are deterministic and are produced only when comparable report
figures are available. AI findings must cite exact report excerpts and are
validated before they are displayed.

LedgerVoid ships as three apps that all use the same deployed dashboard at
[ledgervoid.onrender.com](https://ledgervoid.onrender.com):

| App | Folder | Built with |
| --- | --- | --- |
| Web | repository root | Next.js on a Render free web service |
| macOS and Windows | `desktop/` | Tauri 2 (system WebView) |
| iPhone and iPad | `ios/` | SwiftUI + WKWebView |

The native apps load the live site, so a Render deploy updates every app
without a new native build.

## Requirements

- Node.js 20.9 or newer
- npm

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Configure the AI provider

Analysis uses any OpenAI-compatible chat completions API. By default it calls
`https://llm.devanshx.com/v1` with the `anthropic/claude-opus-5-5` model.

1. Copy `.env.example` to `.env.local` and set `LLM_API_KEY` to your key. Keep
   `.env.local` private; it is ignored by Git. Never use a `NEXT_PUBLIC_`
   prefix for the API key.
2. Optionally set `LLM_BASE_URL` (ending in `/v1`) and `LLM_MODEL` to use a
   different provider or model.
3. Restart the development server after changing environment variables.

The API request is made only from `app/api/analysis/route.ts`. PDF text is
extracted locally, and no report excerpt is sent to the provider until you
click **Analyse report**. The endpoint sends a limited set of relevant page
excerpts, not the original PDF.

## Deploy on Render

The site runs as a Render web service on the **Free** plan, deployed from
`main` on every push:

- Runtime: Node, region Singapore
- Build command: `npm ci && npm run build`
- Start command: `npm start` (Next.js reads Render's `PORT`)
- Environment variables: `LLM_API_KEY` (required), and optionally
  `LLM_BASE_URL` and `LLM_MODEL`. Do not prefix them with `NEXT_PUBLIC_`.

Free plan limits: the service spins down after 15 minutes without traffic,
and the next visit waits about a minute while it starts again. Each workspace
gets 750 free instance hours a month, which covers one service running all
month. Without a payment method on the Render account, exceeding a monthly
limit suspends the service or pauses builds instead of billing.

## Desktop app (macOS and Windows)

Requires [Rust](https://rustup.rs) and the
[Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS.

```bash
cd desktop
npm install
npm run dev     # open the app
npm run build   # macOS: .app and .dmg; Windows: NSIS setup .exe
```

Build each platform on its own OS. Bundles are written to
`desktop/src-tauri/target/release/bundle/`. Links to other sites open in the
default browser.

### Releases from GitHub Actions

`.github/workflows/desktop-release.yml` builds a universal macOS `.dmg` and a
Windows setup `.exe`. Run it from the **Actions** tab, or push a version tag to
also create a draft GitHub release with both installers:

```bash
git tag v0.2.0
git push origin v0.2.0
```

The tag sets the app version. Without signing secrets, the workflow still
builds: the macOS app is ad-hoc signed and the Windows installer is unsigned,
so users see a security warning on first launch.

### Signing the desktop installers

Add these under **Settings → Secrets and variables → Actions** in GitHub.

**macOS (Developer ID signing and notarization).** Requires a paid
[Apple Developer Program](https://developer.apple.com/programs/enroll/)
membership.

| Secret | Value |
| --- | --- |
| `APPLE_CERTIFICATE` | A *Developer ID Application* certificate exported from Keychain Access as `.p12`, then `openssl base64 -A -in cert.p12` |
| `APPLE_CERTIFICATE_PASSWORD` | The password chosen when exporting the `.p12` |
| `APPLE_API_ISSUER` | Issuer ID from App Store Connect → Users and Access → Integrations |
| `APPLE_API_KEY` | Key ID of an App Store Connect API key with Developer access |
| `APPLE_API_PRIVATE_KEY` | Full contents of that key's `AuthKey_<KeyID>.p8` file |

Setting `APPLE_CERTIFICATE` without the others fails the build, because a
Developer ID app that is not notarized is still blocked by macOS.

**Windows (Authenticode signing through SignPath).** The
[SignPath Foundation](https://signpath.org) signs open-source projects for
free; the certificate is issued in the Foundation's name. After your project
is accepted, create a project with slug `ledgervoid`, a `release-signing`
policy, GitHub as its trusted build system, and this artifact configuration:

```xml
<artifact-configuration xmlns="http://signpath.io/artifact-configuration/v1">
  <zip-file>
    <pe-file path="*-setup.exe">
      <authenticode-sign/>
    </pe-file>
  </zip-file>
</artifact-configuration>
```

Then add the `SIGNPATH_API_TOKEN` secret (a CI user's API token) and the
`SIGNPATH_ORGANIZATION_ID` variable. Set `SIGNPATH_PROJECT_SLUG` or
`SIGNPATH_SIGNING_POLICY_SLUG` variables only if you chose other slugs. If the
policy requires approval, approve the request in SignPath while the workflow
waits (up to 10 minutes).

## iOS app

Requires Xcode 16 or newer and [XcodeGen](https://github.com/yonaskolb/XcodeGen).

```bash
cd ios
xcodegen generate
open LedgerVoid.xcodeproj
```

Pick an iPhone simulator and run. Pull down to reload; links to other sites
open in Safari.

## Troubleshooting

- **AI provider not configured:** add `LLM_API_KEY` to `.env.local` locally or
  to the Render service's environment variables, then redeploy.
- **401/403:** verify the API key is current.
- **Model unavailable:** check `LLM_MODEL` and `LLM_BASE_URL`.
- **Rate limited:** wait and retry later. Requests are not retried
  automatically.
- **Timed out:** retry the analysis later.
- **Unreadable or scanned PDF:** this stage extracts selectable text only.
  Image-only/scanned PDFs need OCR, which is not included.
- **Unsupported evidence or malformed model response:** the response is
  rejected rather than displayed. Retry the analysis.

## Available checks

```bash
npm run lint
npm run typecheck
npm run build
```

Analysis is explicitly user-triggered. The request path has input-size limits,
timeouts, per-instance rate limiting, schema checks, exact page-quote
verification, and numeric-source validation.
