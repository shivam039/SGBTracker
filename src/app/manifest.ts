import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SGB Tracker",
    short_name: "SGB Tracker",
    description: "Sovereign Gold Bond secondary-market tracker and value ranking",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f8fa",
    theme_color: "#14181f",
    orientation: "portrait-primary",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
