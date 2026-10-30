import type { MetadataRoute } from "next";

// Lets phones install the site from the browser: home-screen icon, opens full screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Unlabeled",
    short_name: "Unlabeled",
    description: "Talk to anyone on Earth in your own language. No labels until you both say so.",
    start_url: "/twin",
    scope: "/",
    display: "standalone",
    background_color: "#151A2E",
    theme_color: "#151A2E",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
