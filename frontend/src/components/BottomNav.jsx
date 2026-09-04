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
    <div className="fixed bottom-0 left-0 right-0 md:hidden bg-panel border-t border-border flex justify-around py-2.5 z-10">
      {tabs.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[10px] px-2 ${
              isActive ? "text-accent" : "text-muted"
            }`
          }
        >
          <Icon size={20} />
          {label}
        </NavLink>
      ))}
    </div>
  );
}
