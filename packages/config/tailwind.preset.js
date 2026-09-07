/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#F6F4F1",
          100: "#E9E4DC",
          400: "#6B5F52",
          700: "#3A2F26",
          900: "#241A13" // near-black warm base, not flat #111
        },
        turmeric: {
          100: "#FBE8BE",
          400: "#E3A008",
          600: "#B77D06"
        },
        chili: {
          400: "#C1451F",
          600: "#93341A"
        },
        leaf: {
          100: "#E4EEDD",
          500: "#3F7D58",
          700: "#2C5A3F"
        }
      },
      fontFamily: {
        display: ["Fraunces", "ui-serif", "Georgia", "serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      borderRadius: {
        card: "10px"
      }
    }
  }
};
