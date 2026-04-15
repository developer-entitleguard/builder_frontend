Environment: .env.development is configured correctly (VITE_API_BASE_URL=http://localhost:8080)
Dev server: Running at http://localhost:3000/
Note: The CLAUDE.md mentions port 5173, but the Vite config is set to use port 3000. The app is accessible at http://localhost:3000/.

Also per the docs, the backend (App 1 — EG Backend) needs to be running on localhost:8080 for API calls to work. Without it, you'll be able to see the UI but API requests will fail.


npm run dev
