import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import * as Sentry from '@sentry/react';
import App from './App.tsx';
import { store } from './store';
import { initSentry } from './sentry';
import './index.css';

initSentry();

createRoot(document.getElementById("root")!).render(
  <Sentry.ErrorBoundary fallback={<p>Something went wrong. The team has been notified.</p>}>
    <Provider store={store}>
      <App />
    </Provider>
  </Sentry.ErrorBoundary>
);
