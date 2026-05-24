import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        orbit: {
          ink: "#19201d",
          field: "#f7f7f2",
          line: "#d9ded3",
          green: "#0f766e",
          leaf: "#2f7d32",
          amber: "#b7791f",
          clay: "#ad4b3d",
          sky: "#2563eb"
        }
      },
      boxShadow: {
        panel: "0 10px 30px rgba(25, 32, 29, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
