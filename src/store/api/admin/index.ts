// Central registration + re-export for the platform-admin endpoint modules.
// Importing this file (done once from src/store/index.ts) runs every
// injectEndpoints() so the hooks below are available app-wide.
export * from './authApi';
export * from './orgsApi';
export * from './usersApi';
export * from './entitlementsApi';
export * from './adminsApi';
export * from './types';
