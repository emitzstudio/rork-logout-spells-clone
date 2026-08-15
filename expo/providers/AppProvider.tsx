import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { useCallback, useEffect, useState } from "react";

const PORTAL_SEEN_KEY = "ls.portal.seen";

/** Global app state: the ritual portal gate + the Apply to Host modal. */
export const [AppProvider, useApp] = createContextHook(() => {
  const [portalDone, setPortalDoneState] = useState<boolean>(false);
  /** True once we know whether this device has seen the portal before. */
  const [portalReady, setPortalReady] = useState<boolean>(false);
  const [applyOpen, setApplyOpen] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(PORTAL_SEEN_KEY)
      .then((seen) => {
        if (!cancelled && seen === "1") setPortalDoneState(true);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setPortalReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setPortalDone = useCallback((done: boolean) => {
    setPortalDoneState(done);
    if (done) {
      AsyncStorage.setItem(PORTAL_SEEN_KEY, "1").catch(() => {});
    }
  }, []);

  const openApply = useCallback(() => setApplyOpen(true), []);
  const closeApply = useCallback(() => setApplyOpen(false), []);

  return {
    portalDone,
    portalReady,
    setPortalDone,
    applyOpen,
    openApply,
    closeApply,
  };
});
