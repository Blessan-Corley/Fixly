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
          // Backgrounds - Enhanced neutral system
          bg: '#FDFDFD',           // Softest warm white
          'bg-secondary': '#F7F8FA', // Light warm gray with blue undertone
          'bg-muted': '#F0F2F5',   // Slightly darker for contrast
          'bg-dark': '#1A1D23',    // Rich dark background
          'bg-dark-secondary': '#252830', // Dark secondary
          
          // Text colors - Enhanced contrast and readability
          text: '#1C1F26',         // Rich charcoal (better than pure black)
          'text-secondary': '#4A5568', // Balanced medium gray
          'text-muted': '#718096', // Softer muted text
          'text-light': '#A0AEC0', // Light for placeholders/disabled
          'text-dark': '#E2E8F0',  // Light text for dark backgrounds
          
          // Primary accent - Enhanced teal system
          primary: '#0D9488',      // Vibrant professional teal
          'primary-light': '#14C0B8', // Brighter teal
          'primary-dark': '#0F766E', // Deeper teal
          'primary-soft': '#7DD3FC', // Very light accent
          'primary-bg': '#F0FDFA',   // Minimal background tint
          'primary-hover': '#0B7E73', // Darker hover state
          
          // Enhanced accent system
          accent: '#0D9488',       // Matching primary
          'accent-light': '#14C0B8',
          'accent-dark': '#0A5D56',
          'accent-soft': '#B2F5EA',
          'accent-bg': '#E6FFFA',
          
          // Professional secondary colors
          secondary: '#64748B',    // Slate gray
          'secondary-light': '#94A3B8',
          'secondary-dark': '#475569',
          'secondary-soft': '#E2E8F0',
          'secondary-bg': '#F8FAFC',
          
          // Enhanced surface colors
          card: '#FFFFFF',         // Pure white cards
          'card-hover': '#FAFBFC', // Subtle hover
          'card-dark': '#2D3748',  // Dark mode cards
          border: '#E2E8F0',       // Softer borders
          'border-light': '#F1F5F9', // Very light borders
          'border-dark': '#4A5568', // Dark mode borders
          
          // Professional status colors with better contrast
          success: '#059669',      // Forest green
          'success-light': '#10B981',
          'success-dark': '#047857',
          'success-bg': '#ECFDF5',
          'success-text': '#065F46',
          
          warning: '#D97706',      // Amber
          'warning-light': '#F59E0B',
          'warning-dark': '#B45309',
          'warning-bg': '#FFFBEB',
          'warning-text': '#92400E',
          
          error: '#DC2626',        // Professional red
          'error-light': '#EF4444',
          'error-dark': '#B91C1C',
          'error-bg': '#FEF2F2',
          'error-text': '#991B1B',
          
          info: '#2563EB',         // Professional blue
          'info-light': '#3B82F6',
          'info-dark': '#1D4ED8',
          'info-bg': '#EFF6FF',
          'info-text': '#1E40AF',
          
          // Brand gradient colors
          'gradient-start': '#0D9488',
          'gradient-end': '#14C0B8',
          'gradient-secondary': '#64748B',
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