/* Theme: light default, follows OS preference unless user overrides.
   Include with <script src="theme.js"></script> in <head> (no defer — must run early). */
(function () {
  const KEY = "das-theme";
  const root = document.documentElement;
  const saved = localStorage.getItem(KEY);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  if (saved === "dark" || saved === "light") {
    root.dataset.theme = saved;
  } else if (prefersDark) {
    root.dataset.theme = "dark";
  } else {
    root.dataset.theme = "light";
  }

  // live-follow OS changes only when user hasn't chosen
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    if (!localStorage.getItem(KEY)) root.dataset.theme = e.matches ? "dark" : "light";
  });

  window.toggleTheme = function () {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    localStorage.setItem(KEY, next);
    updateToggleIcon();
  };

  window.updateToggleIcon = function () {
    document.querySelectorAll(".theme-toggle").forEach((btn) => {
      const dark = root.dataset.theme === "dark";
      btn.innerHTML = dark
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
      btn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    });
  };

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".theme-toggle").forEach((btn) => {
      btn.addEventListener("click", window.toggleTheme);
    });
    updateToggleIcon();
  });
})();
