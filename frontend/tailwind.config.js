/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "system-ui", "Segoe UI", "sans-serif"],
      },
      colors: {
        base: "#F0F7FF",
        panel: "#FFFFFF",
        panel2: "#E8F3FE",
        border: "#D0E4F7",
        accent: "#0EA5E9",
        accent2: "#2563EB",
        muted: "#5B7A99",
        ink: "#0B1F33",
        high: "#16A34A",
        medium: "#D97706",
        low: "#DC2626",
      },
      borderRadius: {
        xl2: "1.25rem",
        xl3: "1.75rem",
      },
      boxShadow: {
        soft: "0 4px 24px -4px rgba(37, 99, 235, 0.08), 0 2px 8px -2px rgba(15, 41, 66, 0.04)",
        card: "0 8px 30px -8px rgba(37, 99, 235, 0.12), 0 2px 10px -4px rgba(15, 41, 66, 0.06)",
        glow: "0 0 0 1px rgba(14, 165, 233, 0.12), 0 12px 40px -10px rgba(37, 99, 235, 0.35)",
        nav: "0 -8px 32px -8px rgba(15, 41, 66, 0.12), 0 0 0 1px rgba(211, 231, 247, 0.8)",
        float: "0 16px 48px -12px rgba(37, 99, 235, 0.25)",
      },
      backgroundImage: {
        "mesh-hero":
          "radial-gradient(ellipse 80% 60% at 20% 10%, rgba(56, 189, 248, 0.35), transparent 50%), radial-gradient(ellipse 60% 50% at 90% 20%, rgba(99, 102, 241, 0.3), transparent 45%), radial-gradient(ellipse 50% 40% at 50% 100%, rgba(45, 212, 191, 0.2), transparent 50%)",
        "page-glow":
          "radial-gradient(ellipse 100% 80% at 50% -20%, rgba(14, 165, 233, 0.12), transparent 55%), radial-gradient(ellipse 60% 40% at 100% 50%, rgba(37, 99, 235, 0.06), transparent 50%)",
      },
      keyframes: {
        fadeSlideUp: {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        popIn: {
          "0%": { transform: "scale(0.92)", opacity: "0" },
          "60%": { transform: "scale(1.04)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        floaty: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.45", transform: "scale(1)" },
          "50%": { opacity: "0.75", transform: "scale(1.05)" },
        },
        gradientShift: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      animation: {
        "fade-slide-up": "fadeSlideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) both",
        shimmer: "shimmer 1.6s infinite linear",
        "pop-in": "popIn 0.28s cubic-bezier(0.22, 1, 0.36, 1) both",
        floaty: "floaty 5s ease-in-out infinite",
        "pulse-soft": "pulseSoft 3.5s ease-in-out infinite",
        "gradient-shift": "gradientShift 8s ease infinite",
      },
    },
  },
  plugins: [],
};
