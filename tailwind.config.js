/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bricolage Grotesque"', "system-ui", "sans-serif"],
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
      },
      colors: {
        cream: {
          50: "#FFFDF7",
          100: "#FBF6E9",
          200: "#F3EAD0",
        },
        amber: {
          DEFAULT: "#F5A524",
          deep: "#E8930A",
          ink: "#3A2A05",
        },
        leaf: {
          DEFAULT: "#6FB95B",
          deep: "#4E9A3A",
          ink: "#1F3A12",
        },
        ink: "#161413",
      },
      boxShadow: {
        pill: "0 6px 18px -8px rgba(20,16,8,0.25)",
        sheet: "0 -20px 60px -20px rgba(20,16,8,0.35)",
        float: "0 8px 24px -6px rgba(20,16,8,0.25)",
      },
      keyframes: {
        "slide-up": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "slide-up": "slide-up 280ms cubic-bezier(0.22, 1, 0.36, 1)",
        "fade-in": "fade-in 200ms ease-out",
      },
    },
  },
  plugins: [],
};
