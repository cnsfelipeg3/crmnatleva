import { useEffect, useState } from "react";

export function useStandalone() {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const check = () =>
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS legacy
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    setIsStandalone(check());
    const mql = window.matchMedia("(display-mode: standalone)");
    const handler = () => setIsStandalone(check());
    mql.addEventListener?.("change", handler);
    return () => mql.removeEventListener?.("change", handler);
  }, []);

  return isStandalone;
}
