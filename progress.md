Original prompt: Publish a standalone synthetic game on GitHub Pages for Apple Watch testing, with no one-hour expiry.

- The original application and deployment are untouched.
- All public game code and SVG artwork are standalone; no company files, real data, credentials or profiles are copied.
- Browser-only five-round game, 30-second decisions, release-gated Actual, final-price scoring, local refresh recovery and device scores.
- No external network requests from the application.
- Chromium tests passed at 198x242 and 1440x900: five rounds, positive and negative scoring, release-gated Actual, refresh deadline preservation, timeout with no attempt, saved scores, and unavailable local storage.
- Zero external requests and browser console errors in the tested flow. UP and DOWN fit fully within the watch viewport.
- WebKit is not installed locally; physical watchOS testing remains necessary.
- Pending: publication and live URL verification.
