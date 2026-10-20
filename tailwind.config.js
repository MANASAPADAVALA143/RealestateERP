/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#0B1D33",
        gold: "#C79A2B",
        ivory: "#F8F6F0",
      },
      fontFamily: {
        sans: ["Outfit", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["Fraunces", "Georgia", "ui-serif", "serif"],
      },
      boxShadow: {
        card: "0 10px 30px rgba(11, 29, 51, 0.05)",
      },
    },
  },
  plugins: [],
};
