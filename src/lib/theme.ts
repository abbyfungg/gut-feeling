export const ACCENTS = [
  { id: "forest", name: "Forest" },
  { id: "sunset", name: "Sunset" },
  { id: "ocean", name: "Ocean" },
  { id: "lavender", name: "Lavender" },
] as const;
export type AccentId = (typeof ACCENTS)[number]["id"];
export const MODES = [
  { id: "system", name: "Auto" },
  { id: "light", name: "Light" },
  { id: "dark", name: "Dark" },
] as const;
export type ModeId = (typeof MODES)[number]["id"];
export const THEME_STORAGE = { accent: "gf-accent", mode: "gf-mode" } as const;

/**
 * Runs before first paint (inlined in <head>) so the saved theme never flashes.
 * Only reads two non-sensitive preferences from localStorage.
 */
export const THEME_SCRIPT = `(function(){try{var d=document.documentElement;var a=localStorage.getItem("${THEME_STORAGE.accent}")||"forest";var m=localStorage.getItem("${THEME_STORAGE.mode}")||"system";if(!/^(forest|sunset|ocean|lavender)$/.test(a))a="forest";if(!/^(system|light|dark)$/.test(m))m="system";var q=window.matchMedia("(prefers-color-scheme: dark)");var apply=function(){d.dataset.accent=a;d.dataset.mode=m;d.dataset.scheme=m==="system"?(q.matches?"dark":"light"):m;};apply();q.addEventListener&&q.addEventListener("change",function(){if(d.dataset.mode==="system"){d.dataset.scheme=q.matches?"dark":"light";}});}catch(e){}})();`;
