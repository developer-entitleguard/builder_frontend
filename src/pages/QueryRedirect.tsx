import { Navigate, useLocation } from "react-router-dom";

/**
 * Redirects legacy query routes (/pendingQueries, /awaitingAction, /queriesComplete)
 * to the unified /queries/:id page.
 */
const QueryRedirect = () => {
  const location = useLocation();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query = (location.state as any)?.query;
  const queryId = query?.id;

  if (queryId) {
    return <Navigate to={`/queries/${queryId}`} replace />;
  }

  return <Navigate to="/queries" replace />;
};

export default QueryRedirect;
