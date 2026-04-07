import NatLevaLoader from "./NatLevaLoader";

export const FIRST_LOAD_KEY = "__natleva_first_load_done__";

export function hasCompletedInitialLoad(): boolean {
  if (typeof window === "undefined") return false;

  try {
    return window.sessionStorage.getItem(FIRST_LOAD_KEY) === "1";
  } catch {
    return false;
  }
}

export function markInitialLoadComplete() {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(FIRST_LOAD_KEY, "1");
  } catch {
    // no-op when storage is unavailable
  }
}

export function MinimalLoader({ inline = false }: { inline?: boolean }) {
  return (
    <div className={inline ? "flex min-h-[12rem] w-full items-center justify-center" : "flex min-h-screen w-full items-center justify-center"}>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

export function SessionAwareLoader() {
  return hasCompletedInitialLoad() ? <MinimalLoader /> : <NatLevaLoader />;
}