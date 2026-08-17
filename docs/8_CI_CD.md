# SmartCraving CI/CD Pipeline

## 1. Workflow location

The GitHub Actions workflow is defined in:

```text
.github/workflows/ci.yml
```

## 2. When CI runs

CI runs automatically for:

- Every push to the `main` branch.
- Every pull request targeting the `main` branch.

Only one run for the same workflow/ref is kept active. If a newer commit is pushed, an older in-progress run is cancelled.

## 3. Jobs

### Frontend: lint and build

The frontend job runs on Ubuntu with Node.js 20 and performs:

1. Repository checkout.
2. npm dependency caching using `frontend/package-lock.json`.
3. Dependency installation with `npm install --legacy-peer-deps --no-audit --no-fund`.
4. ESLint through `npm run lint`.
5. Production build through `npm run build`.

The build validates React/Vite compilation and catches invalid imports or production bundling errors.

### Backend: syntax checks

The backend job runs on Ubuntu with Node.js 20 and performs:

1. Repository checkout.
2. npm dependency caching using `backend/package-lock.json`.
3. Reproducible dependency installation with `npm ci`.
4. `node --check` against every backend JavaScript file outside `node_modules`.

Syntax checking does not start the server and therefore does not require MongoDB, Stripe, Cloudinary, SMTP, or Groq credentials.

## 4. Security settings

The workflow uses:

```yaml
permissions:
  contents: read
```

No application secrets are stored in the workflow. Do not add database URLs, JWT secrets, payment keys, or AI provider keys to this file. Integration tests that require secrets should use GitHub Actions Secrets and a separate protected workflow/job.

## 5. Local equivalent

Run the same checks locally before pushing:

```bash
cd frontend
npm install --legacy-peer-deps --no-audit --no-fund
npm run lint
npm run build
```

```bash
cd backend
npm ci

set -euo pipefail
while IFS= read -r -d '' file; do
  node --check "$file"
done < <(find . -path './node_modules' -prune -o -type f -name '*.js' -print0)
```

## 6. What CI currently does not verify

The current pipeline intentionally does not run:

- MongoDB integration tests.
- Stripe payment tests.
- Cloudinary upload tests.
- SMTP/password-reset delivery tests.
- Groq AI API calls.
- Deployment or production smoke tests.

These checks need isolated test resources, credentials, and cleanup rules. They should be added as separate integration or deployment workflows rather than making every code push dependent on live third-party services.

## 7. Frontend lockfile follow-up

The frontend `package-lock.json` currently lacks several transitive dependency entries, so `npm ci` fails with “Missing ... from lock file”. The `ERESOLVE` messages are non-fatal peer-dependency warnings caused mainly by the legacy `mdbreact` package and React 18. Regenerate and commit the lockfile from a network-enabled development environment:

```bash
cd frontend
npm install --legacy-peer-deps --ignore-scripts
```

After confirming `npm ci` succeeds in a clean checkout, change the frontend CI install step back to `npm ci`.

## 8. Branch protection recommendation

For the `main` branch, require the following status checks before merging:

- `Frontend lint and build`
- `Backend syntax checks`

Also enable required pull requests, require branches to be up to date, and restrict direct pushes when the project is ready for team collaboration.
