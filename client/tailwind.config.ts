import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"]
      },
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))"
      },
      boxShadow: {
        glass: "0 24px 80px rgba(63, 62, 154, 0.18)",
        glow: "0 0 52px rgba(86, 106, 255, 0.34)"
      }
    }
  },
  plugins: [animate]
} satisfies Config;
