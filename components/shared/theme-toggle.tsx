"use client";

import { Moon, Sun } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { useTheme } from "@/components/shared/theme-provider";

/** Toggles the optional light theme. Dark remains the default. */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <IconButton
      label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggleTheme}
    >
      {isDark ? (
        <Sun className="size-[18px]" aria-hidden="true" />
      ) : (
        <Moon className="size-[18px]" aria-hidden="true" />
      )}
    </IconButton>
  );
}
