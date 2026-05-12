import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      spacing: {
        "safe-top": "env(safe-area-inset-top, 0px)",
        "safe-bottom": "env(safe-area-inset-bottom, 0px)",
        "safe-left": "env(safe-area-inset-left, 0px)",
        "safe-right": "env(safe-area-inset-right, 0px)",
        tap: "44px",
        header: "56px",
        "bottom-nav": "56px",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        serif: ["var(--font-display)"],
        display: ["var(--font-display)"],
        mono: ["var(--font-mono)"],
      },
      // ── Typography tokens · sistema unificado de leading + tracking ──
      letterSpacing: {
        "tightest-2": "-0.04em",
        "tightest": "-0.03em",
        "tight-2": "-0.025em",
        "tight-1": "-0.015em",
        "snug": "-0.01em",
        "relaxed-1": "0.01em",
        "wide-1": "0.04em",
        "wide-2": "0.08em",
        "wide-3": "0.14em",
      },
      lineHeight: {
        "display": "1.05",
        "headline": "1.15",
        "title": "1.25",
        "body": "1.55",
        "comfy": "1.7",
      },
      fontSize: {
        // [size, { lineHeight, letterSpacing }] · opt-in via t-* classes
        "display-xl": ["clamp(2.75rem, 6vw, 4.5rem)", { lineHeight: "1.05", letterSpacing: "-0.04em" }],
        "display-lg": ["clamp(2.25rem, 4.5vw, 3.25rem)", { lineHeight: "1.08", letterSpacing: "-0.035em" }],
        "h1-token": ["clamp(1.75rem, 3vw, 2.25rem)", { lineHeight: "1.15", letterSpacing: "-0.03em" }],
        "h2-token": ["clamp(1.375rem, 2.2vw, 1.625rem)", { lineHeight: "1.2", letterSpacing: "-0.025em" }],
        "h3-token": ["1.125rem", { lineHeight: "1.3", letterSpacing: "-0.015em" }],
        "h4-token": ["1rem", { lineHeight: "1.35", letterSpacing: "-0.01em" }],
        "body-lg": ["1.0625rem", { lineHeight: "1.6", letterSpacing: "-0.005em" }],
        "body-md": ["0.9375rem", { lineHeight: "1.55", letterSpacing: "0" }],
        "body-sm": ["0.8125rem", { lineHeight: "1.5", letterSpacing: "0.005em" }],
        "caption": ["0.75rem", { lineHeight: "1.45", letterSpacing: "0.01em" }],
        "eyebrow": ["0.6875rem", { lineHeight: "1.3", letterSpacing: "0.14em" }],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        champagne: {
          DEFAULT: "hsl(var(--champagne))",
          foreground: "hsl(var(--champagne-foreground))",
        },
        sand: {
          DEFAULT: "hsl(var(--sand))",
          foreground: "hsl(var(--sand-foreground))",
        },
        eucalyptus: {
          DEFAULT: "hsl(var(--eucalyptus))",
          foreground: "hsl(var(--eucalyptus-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          from: { opacity: "0", transform: "translateX(-12px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        takeoff: {
          "0%": { transform: "translateX(0) translateY(0) rotate(0deg)", opacity: "0.3" },
          "30%": { transform: "translateX(40px) translateY(0) rotate(0deg)", opacity: "1" },
          "70%": { transform: "translateX(100px) translateY(-20px) rotate(-10deg)", opacity: "1" },
          "100%": { transform: "translateX(160px) translateY(-50px) rotate(-15deg)", opacity: "0" },
        },
        trail: {
          "0%": { transform: "translateX(0) scaleX(0.3)", opacity: "0" },
          "30%": { transform: "translateX(30px) scaleX(1)", opacity: "0.6" },
          "70%": { transform: "translateX(80px) scaleX(0.8)", opacity: "0.3" },
          "100%": { transform: "translateX(120px) scaleX(0)", opacity: "0" },
        },
        "loader-bounce": {
          "0%, 80%, 100%": { transform: "scale(0.6)", opacity: "0.4" },
          "40%": { transform: "scale(1)", opacity: "1" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.4s ease-out",
        "slide-in": "slide-in 0.3s ease-out",
        takeoff: "takeoff 1.8s ease-in-out infinite",
        trail: "trail 1.8s ease-in-out infinite",
        "loader-bounce": "loader-bounce 1.2s ease-in-out infinite",
        shimmer: "shimmer 2s infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
