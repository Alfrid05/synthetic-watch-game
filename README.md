# Call the Move: Synthetic Watch Demo

A standalone, browser-only prediction game for small-screen testing. All prices, releases, currencies and reactions are fictional. This is not market data or investment advice.

## Play

Choose **Play five rounds**, watch the three-second replay, and choose UP or DOWN within 30 seconds. The tape freezes at point 77; the fictional release is at 80. Actual stays hidden until that release is reached during the reveal. The result compares the final displayed price at point 94 with the frozen price. Higher is UP; lower or unchanged is DOWN. Correct calls earn one point. Timeouts skip the round without adding an attempt. Five rounds complete a session.

The first four rounds cover Rates, FX, Fixed Income and Energy in shuffled order; the fifth repeats one asset class. Headlines and currencies are distinct within a session. These are illustrative combinations, not real instruments.

## Privacy and Storage

- No registration, personal details, marketing consent, credentials or server connection.
- No live feed, SFTP, company network, Python backend or production database.
- Sessions and the best ten completed scores stay in this browser's local storage. Private browsing or blocked storage can prevent persistence.
- No time-based site expiry. This is a public static demo, not an authenticated service.
- Device scores are editable browser data, not a secure shared leaderboard.

## Hosting

GitHub Pages can serve the root of the `main` branch. All asset links are relative, so project-site subpaths work. There are no dependencies or build steps. For a local preview, run `python -m http.server 8767` in this folder.

The compact layout targets watch-sized browser viewports, but actual watchOS browser support must be checked on a physical watch. This is not a native watchOS app.
