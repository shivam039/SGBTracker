import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "SGB Tracker",
    short_name: "SGB Tracker",
    description: "Sovereign Gold Bond secondary-market tracker and value ranking",
    start_url: "/",
    scope: "/",
    lang: "en",
    dir: "ltr",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    launch_handler: { client_mode: "navigate-existing" },
    background_color: "#f7f8fa",
    theme_color: "#14181f",
    orientation: "portrait-primary",
    categories: ["finance", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Dashboard",
        short_name: "Dashboard",
        description: "SGB tranche rankings by economic value",
        url: "/",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Alerts",
        short_name: "Alerts",
        description: "Manage YTM/price alert rules",
        url: "/alerts",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
