import createContextHook from "@nkzw/create-context-hook";
import { useCallback, useState } from "react";

/** Global app state: the ritual portal gate + the Apply to Host modal. */
export const [AppProvider, useApp] = createContextHook(() => {
  const [portalDone, setPortalDone] = useState<boolean>(false);
  const [applyOpen, setApplyOpen] = useState<boolean>(false);

  const openApply = useCallback(() => setApplyOpen(true), []);
  const closeApply = useCallback(() => setApplyOpen(false), []);

  return {
    portalDone,
    setPortalDone,
    applyOpen,
    openApply,
    closeApply,
  };
});
