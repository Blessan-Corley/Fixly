/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Fixly Brand Colors
        fixly: {
          bg: '#F1F2EE',      // Background (White Smoke)
          text: '#374650',     // Text/Card/Header (Outer Space)
          accent: '#DCF763',   // Accent/Highlights (Mindaro)
          'accent-dark': '#c4d951',
          'text-light': '#5a6c75',
          'text-muted': '#8b9ba3',
          'border': '#e1e3e0',
          'card': '#ffffff',
          'success': '#22c55e',
          'warning': '#f59e0b',
          'error': '#ef4444',
          'info': '#3b82f6',
        },
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
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "slide-in": {
          from: { opacity: 0, transform: "translateY(10px)" },
          to: { opacity: 1, transform: "translateY(0px)" },
        },
        "slide-out": {
          from: { opacity: 1, transform: "translateY(0px)" },
          to: { opacity: 0, transform: "translateY(-10px)" },
        },
        "fade-in": {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        "scale-in": {
          from: { opacity: 0, transform: "scale(0.95)" },
          to: { opacity: 1, transform: "scale(1)" },
        },
        "shimmer": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "slide-in": "slide-in 0.3s ease-out",
        "slide-out": "slide-out 0.2s ease-in",
        "fade-in": "fade-in 0.2s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "shimmer": "shimmer 2s infinite",
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'fixly': '0 4px 6px -1px rgba(55, 70, 80, 0.1), 0 2px 4px -1px rgba(55, 70, 80, 0.06)',
        'fixly-lg': '0 10px 15px -3px rgba(55, 70, 80, 0.1), 0 4px 6px -2px rgba(55, 70, 80, 0.05)',
        'fixly-hover': '0 8px 25px -5px rgba(55, 70, 80, 0.15), 0 8px 10px -6px rgba(55, 70, 80, 0.1)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}