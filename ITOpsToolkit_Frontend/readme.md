# ITOPSTOOL UI

## Prerequisites

- Node.js (version 22 - LTS)
- npm or yarn

## Environment Setup

- Ensure the environment is valid; otherwise, the app will throw an error during build/dev-run (see [env.schema.ts](env.schema.ts)).

Set `VITE_APP_PIPELINE_STAGE=development` in [.env](.env) for debug logging (via [src/modules/common/utils/logger.ts](src/modules/common/utils/logger.ts)). For `test`, `uat`, or
`production`, update `VITE_APP_PIPELINE_STAGE` in [.env](.env) accordingly. Logging levels adjust automatically (e.g., `WARN` for non-development).

## Running the Project

### Development Mode

```bash
npm install
npm run dev
```

This starts the Vite dev server with hot reloading.

## Building the Project

Builds are optimized based on the environment. The build process validates env vars and uses [vite.config.ts](vite.config.ts) for configuration.

### Production Build

```bash
npm run build
```

This creates a `dist` folder with optimized assets. For production, set `VITE_APP_PIPELINE_STAGE=production` in [.env](.env).

### Preview Build Locally

After building, preview the production build:

```bash
npm run preview
```

## Testing

Run tests with Vitest (configured in [vitest.config.ts](vitest.config.ts)):

```bash
npm run test
```

For coverage:

```bash
npm run test:coverage
```

# Husky Git Hooks

Husky is set up for pre-commit. Ensure you run `npm run prepare` after cloning to initialize Husky.

to disable pre-commit hooks temporarily:

```bash
npx husky disable
```

to re-enable:

```bash
npx husky enable
```

What the pre-commit hook does:

- Runs tests to ensure code quality before committing.
- Checks code formatting with Prettier.
- Lints code to catch potential issues.

if any of these checks fail, the commit will be aborted, allowing you to fix issues before committing.

if you want to customize the pre-commit hook, edit the `.husky/pre-commit` file.

If in case the Frontend is in a subdirectory of repo,we have upddate the hooks as

    .

├── .git/ ├── backend/ # No package.json └── frontend/ # Package.json with husky ├── package.json └── .husky/

```bash
# frontend/.husky/pre-commit
cd path/to/frontend
npm test
npm run prettier:check
npm run lint:check
```

and update the package.json scripts as

```json
"scripts": {
    "prepare": "cd .. && husky {frontend-path}/.husky",
}
```

## Additional Notes

- Tailwind CSS is integrated via [tailwind.config.js](tailwind.config.js) and [postcss.config.js](postcss.config.js).
- The app entry point is [src/main.tsx](src/main.tsx), which imports [src/main.scss](src/main.scss).
- Error boundaries are handled in [src/App.tsx](src/App.tsx).
- Bundler config see [vite.config.ts](vite.config.ts) and [tsconfig.json](tsconfig.json).
- Test env config see [vitest.config.ts](vitest.config.ts).
