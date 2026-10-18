import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gut Feeling",
    short_name: "Gut Feeling",
    description: "A friendly, private bowel-health diary you can share with your care team.",
    id: "/",
    start_url: "/me",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#faf8f2",
    theme_color: "#faf8f2",
    categories: ["health", "medical", "lifestyle"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Log a bathroom trip", short_name: "Log", url: "/me/log", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Entries", short_name: "Entries", url: "/me/entries", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
