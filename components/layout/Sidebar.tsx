"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  FileText,
  Calendar,
  Radio,
  BarChart2,
  Settings,
  Shield,
  Users,
  LogOut,
  Zap,
} from "lucide-react";

const userNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/posts", label: "Bài đăng", icon: FileText },
  { href: "/calendar", label: "Lịch", icon: Calendar },
  { href: "/channels", label: "Kênh kết nối", icon: Radio },
  { href: "/reports", label: "Báo cáo", icon: BarChart2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

const adminNav = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Người dùng", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const nav = isAdmin ? adminNav : userNav;
  const displayName = session?.user?.name ?? session?.user?.email ?? "User";
  const initial = displayName[0]?.toUpperCase() ?? "U";

  return (
    <aside className="w-60 min-h-screen bg-slate-900 text-white flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-700/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-white text-sm leading-tight">OPA</div>
            <div className="text-slate-400 text-xs leading-tight">Open Publishing</div>
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="mx-4 mt-3 px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-lg flex items-center gap-1.5">
          <Shield size={13} className="text-purple-400" />
          <span className="text-purple-300 text-xs font-medium">Admin</span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                active
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Icon size={17} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User info */}
      <div className="px-4 py-4 border-t border-slate-700/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-xs font-medium truncate">
              {displayName}
            </div>
            <div className="text-slate-500 text-xs truncate">
              {session?.user?.email}
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-slate-500 hover:text-slate-300 transition-colors"
            title="Đăng xuất"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
