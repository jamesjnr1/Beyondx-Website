/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Tightened type scale. Small sizes keep their defaults so body copy stays
      // readable (16px base, 14px minimum for secondary text); the display sizes
      // are pulled in, which is where the page was reading oversized.
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.05rem' }],      // 12px
        sm: ['0.875rem', { lineHeight: '1.3rem' }],      // 14px
        base: ['1rem', { lineHeight: '1.55rem' }],       // 16px
        lg: ['1.0625rem', { lineHeight: '1.65rem' }],    // 17px  (was 18)
        xl: ['1.1875rem', { lineHeight: '1.7rem' }],     // 19px  (was 20)
        '2xl': ['1.375rem', { lineHeight: '1.85rem' }],  // 22px  (was 24)
        '3xl': ['1.625rem', { lineHeight: '2.05rem' }],  // 26px  (was 30)
        '4xl': ['1.9375rem', { lineHeight: '2.3rem' }],  // 31px  (was 36)
        '5xl': ['2.5rem', { lineHeight: '2.75rem' }],    // 40px  (was 48)
        '6xl': ['3rem', { lineHeight: '3.2rem' }],       // 48px  (was 60)
        '7xl': ['3.5rem', { lineHeight: '3.65rem' }],    // 56px  (was 72)
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Fraunces', 'Georgia', 'serif'],
      },
      colors: {
        // Clean cool-neutral off-whites (faint green-grey tint to harmonise with brand green)
        cream: {
          50: '#fafbf8',
          100: '#f2f5ee',
          200: '#e6ebdf',
          300: '#d2dac6',
          400: '#b4c0a3',
        },
        // BeyondX Green — anchored on #6BAB21 (brand primary = forest-600)
        forest: {
          300: '#a6d96a',
          400: '#8bc53f',
          500: '#7bbb2e',
          600: '#6bab21', // BeyondX Green (brand)
          700: '#578c1a',
          800: '#446d14',
          900: '#33520f',
        },
        // Secondary accent — a brighter lime-green so underlines/accents read
        // distinctly against solid brand-green buttons (keeps the brand 2-tone)
        clay: {
          300: '#b7e07a',
          400: '#8bc53f',
          500: '#7bbb2e',
          600: '#578c1a',
        },
        // BeyondX Dark — anchored on #12180E (brand dark = ink-900)
        ink: {
          600: '#3a4235',
          700: '#2a3226',
          800: '#1e2419',
          900: '#12180e', // BeyondX Dark (brand)
          950: '#0b0f08',
        },
      },
    },
  },
  plugins: [],
}
