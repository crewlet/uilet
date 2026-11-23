# Trademarks

"Crewlet", the Crewlet logo and the Crewlet character (in every pose, illustration, animation and rigged or trimmed variant) are trademarks of Crewlet. The source code and assets in this repository are licensed under the Apache License 2.0, and that license covers copyright and patents only: it grants no right to use these trademarks.

## What you may do

- Refer to the project by name to describe it truthfully, for example "built with @crewlethq/ui" or "a fork of the Crewlet design system".
- Use the packages, including the brand files listed below, in an official Crewlet product or in an unmodified build of this repository, such as its Storybook.

## What you may not do

- Use the Crewlet name, logo or character in a way that suggests your product is Crewlet, is endorsed by Crewlet, or is an official distribution.
- Use the logo or the character as the identity of another product, service, company or account, including in a fork. A fork or redistribution that ships a user-facing surface must remove the Crewlet logo and character from it and use a different product name.

## The brand files

These files in the repository carry the Crewlet logo or character:

- `packages/icons/svg/crewlet-icon.svg`
- `packages/icons/svg/crewlet-reading.svg`
- `packages/icons/src/crewletParts.ts`
- `packages/icons/src/CrewletFigure.tsx`
- `packages/icons/src/CrewletFigure.css`

The `CrewletIcon`, `CrewletReading` and `CrewletFigure` components that the `@crewlethq/icons` package builds from them are covered in the same way.

## Third-party marks

`@crewlethq/icons` also ships the marks of the applications a Crewlet product integrates with, or offers as an integration, in `packages/icons/svg/vendor/`, drawn by the `VendorMark` component. Anthropic and Claude, Apple, Apple Ads and App Store Connect, Atlassian, ClickUp, Cloudflare, Cursor, Datadog, DigitalOcean, Discord, Expo, Figma, Gemini CLI, GitHub and GitHub Copilot, GitLab, Google Cloud, Google Ads, AdSense, AdMob, Google Analytics, Search Console and Google Play, Grok, Hermes Agent and Nous Research, Kimi and Kimi Code, Linear, Mattermost, Meta, Meta Ads Manager and Muse Code, Microsoft Teams, Notion, OpenAI and Codex, OpenCode, Pi, PostgreSQL, Qwen and Qwen Code, Scaleway, Sentry, Slack, Stripe and Telegram are trademarks of their respective owners, none of whom are affiliated with Crewlet and none of whom have endorsed it.

They are here for nominative use: naming the application a feature connects to, so that a reader recognises it. That means a mark appears beside that application's own name, identifies only that application, and is never used to suggest a partnership, a sponsorship or an endorsement. Each owner's own brand guidelines apply on top of this page, and where the two differ the owner's win.

The OpenAI, Meta and Kimi marks, which name the Codex, Muse Code and Kimi Code harnesses, were supplied for this use. Each file is its owner's own published drawing of that mark.

Crewlet claims no rights in these marks. They are excluded from the Apache License's grant for the same reason the Crewlet marks are: that license covers copyright and patents, and a trademark is neither.

The store, ads and analytics marks are their owners' own product icons, taken from each owner's own site (read on 2026-11-23, each source recorded with its changes in the package README):

- Google Analytics: `https://www.gstatic.com/analytics-suite/header/suite/v2/ic_analytics.svg`
- Search Console: `https://www.gstatic.com/images/branding/productlogos/search_console/v1/192px.svg`
- Google Ads: `https://www.gstatic.com/images/branding/productlogos/ads/v5/192px.svg`
- AdSense: `https://www.gstatic.com/images/branding/productlogos/google_adsense/v5/192px.svg`
- AdMob: `https://www.gstatic.com/images/branding/productlogos/admob/v5/192px.svg`
- Google Play: `https://www.gstatic.com/images/branding/productlogos/play_prism/v9/192px.svg`
- App Store Connect: `https://developer.apple.com/assets/elements/icons/app-store-connect/app-store-connect-64x64_2x.png` and `https://developer.apple.com/assets/elements/icons/app-store-connect-dark/app-store-connect-dark-64x64_2x.png`
- Apple Ads: the Apple logo in the global header of `https://www.apple.com/`, which `https://ads.apple.com/` draws before "Ads"
- Meta Ads Manager: the app icon on its Google Play listing, `https://play.google.com/store/apps/details?id=com.facebook.adsmanager`

AWS has no mark for its catalogue tile in the package, because its trademark guidelines allow a third party a plain-text reference only. AWS is a trademark of its owner, used only to name the product, and its tile draws a generic glyph from the Lucide set below, on a neutral plate in the text colour from 16 pixels up, with no colour, shape or lettering of its owner's.

One file there is not a third-party mark: `ssh.svg` is Crewlet's own drawing for its SSH connection (SSH is a protocol, and no vendor publishes a mark for it). It is licensed under the Apache License 2.0 like the rest of the package's artwork.

## The Google Analytics logo

Google's [Google Analytics Developer Branding Guidelines & Policies](https://developers.google.com/analytics/terms/branding-policy) ask an application that shows Google Analytics data to show the official Google Analytics logo next to that data, and need no request for it. `packages/icons/attribution/google-analytics/` carries the two files that page offers for the horizontal logo, byte for byte as Google serves them, with their checksums in `SHA256SUMS` beside them:

- `lockup_ic_Analytics_horiz_272px_clr.png`, for a light ground;
- `lockup_ic_Analytics_horiz_272px_wht.png`, the white-text logo the page asks for on a dark ground.

They are Google's, and Google Analytics is Google's trademark. Neither file is licensed under the Apache License, and neither may be altered. They are for an application that uses the Google Analytics API and shows its data, under Google's API terms, and for nothing else. A Crewlet product shows one wherever it shows data read from Google Analytics, and never as the integration's icon or in a list of integrations, where the Google Analytics product icon above stands; in the engine dashboard that is the Google Analytics integration's own page, beside the properties read from it. The logo is drawn at no less than the policy's 154 by 50 pixels, on one solid ground, linked to Google Analytics, never beside Crewlet's own name or description, and never as the most prominent element on the page.

## The glyph set

The Lucide drawings in `packages/icons/glyphs/` are Lucide's, under the ISC License, and those Lucide derives from Feather are under Feather's MIT License as well. Both licenses grant copyright permissions and say nothing about names, so the drawings may be used and redistributed, while "Lucide" and "Feather" stay the names of those projects: nothing this repository publishes is called by either, and neither project endorses it. `packages/icons/glyphs/LICENSE` carries both texts and ships in the package.

For any use this page does not allow, ask the maintainers first by opening an issue in this repository.
