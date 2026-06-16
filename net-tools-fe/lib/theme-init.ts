/** Inline script for next/script beforeInteractive — prevents theme flash on first paint. */
export function themeInitScript(storageKey = "net-tools-theme"): string {
  return `(function(){try{var k=${JSON.stringify(storageKey)};var t=localStorage.getItem(k);var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}})();`
}
