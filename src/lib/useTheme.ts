import { createPersistentStore, usePersistentStore } from "./createPersistentStore";

/**
 * Theme preference: "system" (follow the OS via prefers-color-scheme, the
 * default) or an explicit "light"/"dark" override. Backed by one
 * module-level store (see createPersistentStore) so the sidebar toggle and
 * any other consumer stay in sync. When an override is set, the DOM's
 * `data-theme` attribute is stamped on <html> (see AppShell), which the CSS
 * token blocks in globals.css honor over the media query; "system" removes
 * the attribute and lets the media query take over. An inline script in
 * layout.tsx applies the stored override before first paint to avoid a
 * flash of the wrong theme.
 */
export type Theme = "light" | "dark" | "system";

const store = createPersistentStore<Theme>({
  storageKey: "theme",
  defaultValue: "system",
  parse: (raw) => (raw === "light" || raw === "dark" ? raw : "system"),
  // Store only an explicit override; "system" removes the key entirely.
  serialize: (value) => (value === "system" ? null : value),
});

export function useTheme(): [Theme, (theme: Theme) => void] {
  const theme = usePersistentStore(store);
  return [theme, store.set];
}
