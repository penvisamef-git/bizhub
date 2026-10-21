import { Navigate, useLocation } from "react-router-dom";
import { auth } from "../lib/auth";
import { ROUTES } from "../config";

// Sends visitors without a login to /login, then back to the page they wanted.
export default function RequireAuth({ children }) {
  const location = useLocation();
  if (!auth.getClientLogin()) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`${ROUTES.login}?next=${next}`} replace />;
  }
  return children;
}
