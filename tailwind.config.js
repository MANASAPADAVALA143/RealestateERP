/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#0B1D33",
          deep: "#0D1B2A",
        },
        gold: "#C79A2B",
        goldLight: "#D4AC4A",
        ivory: "#F8F6F0",
        indigo: {
          metric: "#4F46E5",
        },
        amber: {
          alert: "#F59E0B",
        },
        slate: {
          label: "#64748B",
        },
        border: {
          DEFAULT: "#E2E8F0",
        },
        status: {
          active: "#2563EB",
          pending: "#F59E0B",
          overdue: "#7C3AED",
        },
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
