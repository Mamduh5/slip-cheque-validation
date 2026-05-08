import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17202a",
        paper: "#f8faf7",
        line: "#d9e2dc",
        accent: "#146c5c",
        "accent-dark": "#0e4f44"
      }
    }
  },
  plugins: []
};

export default config;
