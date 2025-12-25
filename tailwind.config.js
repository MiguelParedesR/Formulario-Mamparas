/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./html/**/*.html",
    "./js/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        tpp: {
          dark: "#2f3b52",
          mid: "#3e4b67",
          light: "#f4f6f8",
          orange: "#ffa500",
          border: "#e5e7eb",
          text: "#1f2937",
        },
      },
      spacing: {
        sidebar: "250px",
        sidebarCollapsed: "70px",
      },
      animation: {
        fade: "fadeIn 0.4s ease-out",
        slide: "slideUp 0.5s ease-out",
        grow: "growIn 0.35s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
        slideUp: {
          "0%": { opacity: 0, transform: "translateY(10px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        growIn: {
          "0%": { transform: "scale(0.96)", opacity: 0 },
          "100%": { transform: "scale(1)", opacity: 1 },
        },
      },
    },
  },
  plugins: [],
};

