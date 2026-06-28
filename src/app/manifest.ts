import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FocusForge",
    short_name: "FocusForge",
    description: "Premium study planning, focus sessions, and course progress for students.",
    start_url: "/",
    scope: "/",
    id: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
    orientation: "portrait-primary",
    background_color: "#070a12",
    theme_color: "#070a12",
    categories: ["education", "productivity"],
    shortcuts: [
      {
        name: "Start focus",
        short_name: "Focus",
        description: "Open the focus session workspace.",
        url: "/?view=focus",
        icons: [{ src: "/icons/focusforge-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Add study task",
        short_name: "Plan",
        description: "Open the study planner.",
        url: "/?view=planner",
        icons: [{ src: "/icons/focusforge-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Capture note",
        short_name: "Notes",
        description: "Open study notes.",
        url: "/?view=notes",
        icons: [{ src: "/icons/focusforge-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
    icons: [
      {
        src: "/icons/focusforge-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/focusforge-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/focusforge-mark.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/focusforge-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
