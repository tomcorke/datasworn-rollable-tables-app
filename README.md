# Datasworn Rollable Tables

React + TypeScript SPA for browsing and rolling bundled Datasworn oracle tables.

## GitHub Pages payload

`npm run build:pages` builds the static site into `dist/`. The `gh-pages` branch publishes the contents of `dist/` at its root. Regenerate it from `main` when the app changes.

To publish an update, use an installed dependency set. Do not install packages or modify `package-lock.json` during deployment:

```sh
git switch gh-pages
git merge main --allow-unrelated-histories --no-edit
rm -rf dist
npm run build:pages
git rm -r --cached .
cp -R dist/. .
rm -rf dist
git add -A
git commit -m "Deploy latest main to GitHub Pages"
git push origin gh-pages
```

The `gh-pages` branch must contain only the generated site root files, including `index.html`, `assets/`, and `CNAME`. The merge may restore source files temporarily; `git rm -r --cached .` removes them before the generated files are copied into the branch root. GitHub Pages must be configured to deploy `gh-pages` from its `/ (root)` directory. Do not run package installation or modify `package-lock.json` as part of this process. If dependencies are missing, stop and ask the owner to run the documented manual npm command.

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
