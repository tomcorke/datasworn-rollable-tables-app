# Datasworn Rollable Tables

React + TypeScript SPA for browsing and rolling bundled Datasworn oracle tables.

## Development

Use test-driven development: write or update a focused failing test before implementing behavior, then make it pass and refactor only as needed.

Run the full checks after every change. A passing unit suite alone is not enough. The production build must succeed, and the local app must start and load in a browser or with an HTTP smoke check. Run the formatting check before reporting completion.

```sh
npm install
npm test
npm run format:check
npm run lint
npm run lint:css
npm run typecheck
npm run build
npm run dev -- --host 127.0.0.1
curl -fsS http://127.0.0.1:5173/ >/dev/null
```

Confirm the app itself works after changes. Check the browser console for startup errors, load each ruleset, select a table, roll a result, and verify links, references, and quick access still render. Stop the dev server when finished. Do not report a change complete until tests, lint, typecheck, build, and the local-app smoke check pass.
