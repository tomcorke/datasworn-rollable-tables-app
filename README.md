# Datasworn Rollable Tables

React + TypeScript SPA for browsing and rolling bundled Datasworn oracle tables.

## GitHub Pages payload

`npm run build:pages` builds the static site into `dist/`. The `gh-pages` branch contains only that generated payload and this README, so it can be used as a static publishing branch. Regenerate it from `main` when the app changes.

To publish an update:

```sh
git switch gh-pages
git merge main --allow-unrelated-histories --no-edit
rm -rf dist
npm run build:pages
git rm -r --cached .
git add README.md dist
git commit -m "Deploy latest main to GitHub Pages"
git push origin gh-pages
```

The `gh-pages` branch should retain only `README.md` and `dist/`. The Pages Actions workflow uploads `dist/`, so `public/CNAME` from `main` is included in the build as `dist/CNAME`; it is intentionally inside the uploaded artifact, not at the branch root. The `git rm --cached` command clears the merged source tree from the branch index, then `git add` restores only the README and Pages artifact. Do not run package installation or modify `package-lock.json` as part of this process. If dependencies are missing, stop and ask the owner to run the documented manual npm command.

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
