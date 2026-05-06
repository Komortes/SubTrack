/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("nativewind/preset")],
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0a0a0a",
        ink: "#fafafa",
        muted: "#525252",
        subtle: "#a3a3a3",
        line: "#141414",
        surface: "#141414",
        border: "#1f1f1f",
        accent: "#fafafa",
        danger: "#ef4444"
      }
    }
  },
  plugins: []
};
