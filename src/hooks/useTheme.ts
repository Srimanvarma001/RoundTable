"use client";
import { useEffect, useState } from "react";

export function useTheme() {
  const [theme, setTheme] = useState<"warroom" | "hearth">("warroom");
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme }),
    }).catch(() => {});
  }, [theme]);
  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((j) => {
      if (j.settings?.theme) {
        setTheme(j.settings.theme);
        document.documentElement.dataset.theme = j.settings.theme;
      } else {
        document.documentElement.dataset.theme = "warroom";
      }
    }).catch(() => {});
  }, []);
  return { theme, setTheme };
}
