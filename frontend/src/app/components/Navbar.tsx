"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Ana Sayfa", icon: "🏠" },
  { href: "/chat", label: "Chat", icon: "💬" },
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="glass-strong fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-4 sm:px-8">
      <Link href="/" className="flex items-center gap-2.5 group">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-900/30 group-hover:shadow-emerald-700/40 transition-shadow">
          <span className="text-lg font-black text-white">E</span>
        </div>
        <span className="text-lg font-bold text-white tracking-tight">
          Esnaf<span className="gradient-text">.AI</span>
        </span>
      </Link>

      <div className="flex items-center gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-emerald-600/20 text-emerald-400 shadow-sm"
                  : "text-[#8696a0] hover:text-white hover:bg-white/5"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
