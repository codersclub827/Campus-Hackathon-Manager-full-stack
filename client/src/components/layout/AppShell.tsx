import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Command, Menu, Search, Sparkles } from "lucide-react";
import { useState } from "react";
import { navItems } from "../../data/mock";
import { useNotificationCenter } from "../../lib/notifications";
import { Button } from "../ui/button";

export function AppShell() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadCount } = useNotificationCenter({ silent: true });

  return (
    <div className="min-h-screen p-3 text-slate-950 sm:p-4 lg:p-6">
      <div className="mx-auto grid max-w-[1500px] gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="dark-glass sticky top-4 hidden h-[calc(100vh-2rem)] rounded-[2rem] p-4 text-white lg:block">
          <Brand />
          <nav className="scrollbar-soft mt-8 flex max-h-[calc(100vh-160px)] flex-col gap-1 overflow-auto pr-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive ? "bg-white text-slate-950 shadow-glow" : "text-white/72 hover:bg-white/10 hover:text-white"
                  }`
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="min-w-0">
          <header className="glass sticky top-3 z-20 mb-4 flex items-center justify-between rounded-[1.75rem] px-4 py-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-500">Command Center</p>
                <h1 className="text-lg font-bold capitalize sm:text-2xl">
                  {location.pathname.replace("/", "").replace("-", " ") || "Dashboard"}
                </h1>
              </div>
            </div>
            <div className="hidden items-center gap-3 md:flex">
              <div className="flex h-11 w-72 items-center gap-2 rounded-2xl border border-white/70 bg-white/70 px-3 text-sm text-slate-500">
                <Search className="h-4 w-4" />
                Search teams, users, projects
              </div>
              <Button variant="secondary" size="sm" className="relative" onClick={() => navigate("/notifications")} aria-label="Open notifications">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-black text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Button>
              <Button size="sm">
                <Sparkles className="h-4 w-4" />
                Ask AI
              </Button>
            </div>
          </header>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 p-3 lg:hidden" onClick={() => setOpen(false)}>
          <aside className="dark-glass h-full w-80 max-w-full rounded-[2rem] p-4 text-white" onClick={(event) => event.stopPropagation()}>
            <Brand />
            <nav className="mt-8 flex flex-col gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-white/80 hover:bg-white/10"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </aside>
        </div>
      )}
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-glow">
        <Command className="h-6 w-6" />
      </div>
      <div>
        <p className="text-base font-extrabold">Campus Hackathon</p>
        <p className="text-xs font-medium text-white/55">Manager OS</p>
      </div>
    </div>
  );
}
