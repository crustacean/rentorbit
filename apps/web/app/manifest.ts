import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RentOrbit",
    short_name: "RentOrbit",
    description: "Countrywide Kenyan rental marketplace.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f7f2",
    theme_color: "#0f766e",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml"
      }
    ]
  };
}
