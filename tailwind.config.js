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
        // Professional Soft Color Palette
        fixly: {
          // Backgrounds - Warm, soft neutrals
          bg: '#FEFEFE',           // Softest white with warmth
          'bg-secondary': '#F8F9FA', // Very light warm gray
          'bg-muted': '#F1F3F4',   // Light gray for sections
          
          // Text colors - Professional and readable
          text: '#1F2937',         // Rich dark gray (not black)
          'text-secondary': '#4B5563', // Medium gray
          'text-muted': '#6B7280', // Light gray for subtle text
          'text-light': '#9CA3AF', // Very light for placeholders
          
          // Primary accent - Muted teal/blue (professional yet friendly)
          primary: '#0F766E',      // Deep teal
          'primary-light': '#14B8A6', // Medium teal
          'primary-soft': '#5EEAD4',  // Light teal
          'primary-bg': '#F0FDFA',    // Very light teal background
          
          // Secondary accent - Warm gray
          secondary: '#64748B',    // Professional gray
          'secondary-light': '#94A3B8',
          'secondary-soft': '#CBD5E1',
          'secondary-bg': '#F8FAFC',
          
          // Cards and surfaces
          card: '#FFFFFF',         // Pure white for cards
          'card-hover': '#FAFBFC', // Slight gray on hover
          border: '#E5E7EB',       // Soft border gray
          'border-light': '#F3F4F6', // Very light borders
          
          // Status colors - Muted and professional
          success: '#059669',      // Forest green
          'success-light': '#10B981',
          'success-bg': '#ECFDF5',
          
          warning: '#D97706',      // Warm orange
          'warning-light': '#F59E0B',
          'warning-bg': '#FFFBEB',
          
          error: '#DC2626',        // Muted red
          'error-light': '#EF4444',
          'error-bg': '#FEF2F2',
          
          info: '#2563EB',         // Professional blue
          'info-light': '#3B82F6',
          'info-bg': '#EFF6FF',
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
        sans: ['Inter', 'system-ui', 'sans-serif'],
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