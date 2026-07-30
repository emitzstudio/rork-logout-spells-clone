import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Steps back through in-app history. When the page was opened directly
 * (shared link, refresh) there is nothing to go back to, so it lands on
 * `fallback` instead of leaving the site.
 */
export function useGoBack(fallback: string): () => void {
  const navigate = useNavigate();

  return useCallback(() => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(fallback);
  }, [navigate, fallback]);
}
