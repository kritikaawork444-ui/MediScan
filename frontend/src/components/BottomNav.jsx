import { Home, History, Stethoscope, User, BadgePlus } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function BottomNav() {
  const { t } = useLanguage();
  const tabs = [
    { to: "/", label: t("home"), icon: Home },
    { to: "/ai-checker", label: t("checker"), icon: Stethoscope },
    { to: "/consult", label: t("doctors"), icon: BadgePlus },
    { to: "/history", label: t("history"), icon: History },
    { to: "/profile", label: t("profile"), icon: User },
  ];

  return (
    <div className="fixed bottom-0 inset-x-0 md:hidden z-30 px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-1 pointer-events-none">
      <nav className="pointer-events-auto mx-auto max-w-md rounded-2xl bg-white/90 backdrop-blur-xl border border-white/80 shadow-nav flex justify-around items-center px-1.5 py-2">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `relative flex flex-col items-center gap-0.5 text-[10px] font-semibold min-w-[3.4rem] px-2 py-1.5 rounded-xl transition-all duration-200 ${
                isActive ? "text-accent2" : "text-muted hover:text-ink"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-br from-accent to-accent2 text-white shadow-glow scale-105"
                      : "bg-transparent text-muted"
                  }`}
                >
                  <Icon size={isActive ? 18 : 20} strokeWidth={isActive ? 2.4 : 2} />
                </span>
                <span className={isActive ? "text-accent2" : ""}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
