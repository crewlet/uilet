# Security Policy

## Supported versions

`@crewlethq/tokens`, `@crewlethq/icons` and `@crewlethq/ui` are released together under one version. Security fixes go to `main` and ship in the next release on the current release line; there are no backports to older versions. Upgrade the three packages together to pick up a fix.

## Reporting a vulnerability

Please report vulnerabilities **privately** through [GitHub's private vulnerability reporting](https://github.com/crewlet/uilet/security/advisories/new) ("Report a vulnerability" on the repository's Security tab). Do not open a public issue or pull request for anything you believe is exploitable.

Include what you can: the affected package and version or commit, a reproduction or proof of concept, and the impact you believe it has. You should receive an acknowledgement within a few days, and we will keep you updated while we triage and fix it.

## Scope notes

- **Rendering untrusted content.** The components render the React nodes and strings they are given; they do not sanitise HTML. Treat content that comes from users the same way you would anywhere else in a React application. A component that turns a string prop into markup or a URL without escaping it (for example a way to inject script through a `href`, a `title` or a render prop) is in scope.
- **Third-party requests.** `@crewlethq/tokens/css/material-symbols` is the one stylesheet that contacts a third-party host (Google Fonts). Every other stylesheet and font loads from the application's own origin. A published file that makes any other network request is in scope.
- **Supply chain.** The packages are published from GitHub Actions through npm trusted publishing with provenance. A published version without a provenance attestation, or one whose attestation does not name this repository, is in scope, except `0.2.0`: the first version of each package is published by hand before a trusted publisher can exist (see "First publish (bootstrap)" in RELEASING.md), and carries no attestation. See [RELEASING.md](RELEASING.md) for how releases are produced.
