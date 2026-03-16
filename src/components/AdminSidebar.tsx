"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Shield } from "lucide-react";

const navigation = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Users", href: "/admin/users", icon: Users },
];

export function AdminSidebar() {
    const pathname = usePathname();

    return (
        <div className="w-64 bg-neutral-50 dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800 flex flex-col h-full hidden md:flex transition-colors">
            <div className="p-6 flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-black dark:bg-white flex items-center justify-center text-white dark:text-black shadow-sm">
                    <Shield className="w-5 h-5" />
                </div>
                <div>
                    <p className="text-neutral-900 dark:text-white font-semibold text-lg tracking-wide">Sheopal&apos;s Drive</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">Admin</p>
                </div>
            </div>

            <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
                {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                isActive
                                    ? "bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                                    : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
                            }`}
                        >
                            <item.icon className="w-5 h-5" />
                            <span>{item.name}</span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
