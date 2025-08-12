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
        // Enhanced Professional Color Palette - Light/Dark Compatible
        fixly: {
          // Backgrounds - Auto-adapting based on theme
          bg: 'rgb(var(--background))',
          'bg-secondary': 'rgb(var(--secondary))',
          'bg-muted': 'rgb(var(--muted))',
          'bg-card': 'rgb(var(--card))',
          
          // Text colors - Auto-adapting based on theme
          text: 'rgb(var(--foreground))',
          'text-secondary': 'rgb(var(--muted-foreground))',
          'text-muted': 'rgb(var(--muted-foreground))',
          'text-light': 'rgb(var(--muted-foreground))',
          
          // Primary accent - Auto-adapting based on theme
          primary: 'rgb(var(--primary))',
          'primary-light': 'rgb(var(--fixly-primary-light))',
          'primary-dark': 'rgb(var(--fixly-primary-dark))',
          'primary-hover': 'rgb(var(--fixly-primary-hover))',
          'primary-bg': 'hsl(var(--primary) / 0.1)',
          'primary-soft': 'hsl(var(--primary) / 0.2)',
          
          // Enhanced accent system - Auto-adapting
          accent: 'rgb(var(--accent))',
          'accent-light': 'rgb(var(--fixly-primary-light))',
          'accent-dark': 'rgb(var(--fixly-primary-dark))',
          'accent-soft': 'hsl(var(--accent) / 0.2)',
          'accent-bg': 'hsl(var(--accent) / 0.1)',
          
          // Professional secondary colors - Auto-adapting
          secondary: 'rgb(var(--secondary))',
          'secondary-light': 'hsl(var(--secondary) / 0.8)',
          'secondary-dark': 'hsl(var(--secondary) / 1.2)',
          'secondary-soft': 'hsl(var(--secondary) / 0.5)',
          'secondary-bg': 'hsl(var(--secondary) / 0.3)',
          
          // Enhanced surface colors - Auto-adapting
          card: 'rgb(var(--card))',
          'card-hover': 'hsl(var(--card) / 0.8)',
          border: 'rgb(var(--border))',
          'border-light': 'hsl(var(--border) / 0.5)',
          
          // Professional status colors - Auto-adapting
          success: 'rgb(var(--success))',
          'success-light': 'hsl(var(--success) / 0.8)',
          'success-dark': 'hsl(var(--success) / 1.2)',
          'success-bg': 'hsl(var(--success) / 0.1)',
          'success-text': 'hsl(var(--success) / 1.5)',
          
          warning: 'rgb(var(--warning))',
          'warning-light': 'hsl(var(--warning) / 0.8)',
          'warning-dark': 'hsl(var(--warning) / 1.2)',
          'warning-bg': 'hsl(var(--warning) / 0.1)',
          'warning-text': 'hsl(var(--warning) / 1.5)',
          
          error: 'rgb(var(--error))',
          'error-light': 'hsl(var(--error) / 0.8)',
          'error-dark': 'hsl(var(--error) / 1.2)',
          'error-bg': 'hsl(var(--error) / 0.1)',
          'error-text': 'hsl(var(--error) / 1.5)',
          
          info: 'rgb(var(--info))',
          'info-light': 'hsl(var(--info) / 0.8)',
          'info-dark': 'hsl(var(--info) / 1.2)',
          'info-bg': 'hsl(var(--info) / 0.1)',
          'info-text': 'hsl(var(--info) / 1.5)',
          
          // Brand gradient colors - Auto-adapting
          'gradient-start': 'rgb(var(--fixly-gradient-start))',
          'gradient-end': 'rgb(var(--fixly-gradient-end))',
        },
        
        // Keep existing shadcn colors for compatibility
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
        'manrope': ['var(--font-manrope)', 'sans-serif'],
        'pt-mono': ['var(--font-pt-mono)', 'monospace'],
        sans: ['var(--font-manrope)', 'system-ui', 'sans-serif'],
        heading: ['var(--font-manrope)', 'sans-serif'],
        mono: ['var(--font-pt-mono)', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
      },
      boxShadow: {
        // Softer, more professional shadows
        'fixly': '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'fixly-md': '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
        'fixly-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
        'fixly-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.02)',
        'fixly-hover': '0 8px 25px -8px rgba(15, 118, 110, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}