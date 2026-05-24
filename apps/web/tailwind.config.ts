import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        orbit: {
          ink: "rgb(var(--color-orbit-ink) / <alpha-value>)",
          field: "rgb(var(--color-orbit-field) / <alpha-value>)",
          line: "rgb(var(--color-orbit-line) / <alpha-value>)",
          panel: "rgb(var(--color-orbit-panel) / <alpha-value>)",
          soft: "rgb(var(--color-orbit-soft) / <alpha-value>)",
          green: "rgb(var(--color-orbit-primary) / <alpha-value>)",
          leaf: "rgb(var(--color-orbit-leaf) / <alpha-value>)",
          amber: "rgb(var(--color-orbit-amber) / <alpha-value>)",
          clay: "rgb(var(--color-orbit-clay) / <alpha-value>)",
          sky: "rgb(var(--color-orbit-accent) / <alpha-value>)"
        }
      },
      boxShadow: {
        panel: "0 10px 30px rgb(var(--color-orbit-shadow) / 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
