"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem("zawiya-theme", theme);
  } catch {
    /* storage unavailable (private mode, etc.) — theme just won't persist */
  }
}

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme") as Theme | null;
    // Deliberately synced post-mount, not computed during render: the server
    // has no access to the client's saved theme (localStorage/matchMedia), so
    // the initial render must match server output exactly to avoid a
    // hydration mismatch. This one-time correction after mount is the same
    // pattern theme-toggle libraries like next-themes use.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(
      current ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    );
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark mode for eye comfort"
      title="Toggle light / dark"
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground ${className}`}
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
