import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import * as Sentry from '@sentry/react';
import App from './App.tsx';
import { store } from './store';
import { initSentry } from './sentry';
import { initSessionRefresh } from './lib/auth/session';
import './index.css';

initSentry();
// Keep the access token fresh for the life of the tab, so a returning user
// lands on a working app instead of the sign-in screen.
initSessionRefresh();

createRoot(document.getElementById("root")!).render(
  <Sentry.ErrorBoundary fallback={<p>Something went wrong. The team has been notified.</p>}>
    <Provider store={store}>
      <App />
    </Provider>
  </Sentry.ErrorBoundary>
);
