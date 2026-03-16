"use client";

import { Users, HardDrive, Database } from "lucide-react";
import { useUsersStorage } from "@/hooks/use-users";

function formatStorage(bytes: number) {
    if (bytes >= 1024 * 1024 * 1024) {
        return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
    }

    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function AdminDashboardPanel() {
    const { data, isLoading } = useUsersStorage();
    const users = data?.users || [];
    const totalUsed = users.reduce((sum, user) => sum + user.storageUsed, 0);
    const totalLimit = users.reduce((sum, user) => sum + user.storageLimit, 0);

    const stats = [
        {
            label: "Total Users",
            value: String(users.length),
            icon: Users,
        },
        {
            label: "Storage Used",
            value: formatStorage(totalUsed),
            icon: HardDrive,
        },
        {
            label: "Storage Allocated",
            value: formatStorage(totalLimit),
            icon: Database,
        },
    ];

    return (
        <div className="p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-semibold text-neutral-900 dark:text-white">Admin Dashboard</h1>
                <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                    Users summary and storage usage across Sheopal&apos;s Drive.
                </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
                {stats.map((stat) => (
                    <div
                        key={stat.label}
                        className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
                    >
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{stat.label}</p>
                            <stat.icon className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
                        </div>
                        <p className="mt-4 text-3xl font-semibold text-neutral-900 dark:text-white">
                            {isLoading ? "..." : stat.value}
                        </p>
                    </div>
                ))}
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                <div className="border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
                    <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Users Overview</h2>
                </div>
                <div className="grid grid-cols-[1.5fr_1fr_1fr] gap-4 px-6 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
                    <span>User</span>
                    <span>Used</span>
                    <span>Limit</span>
                </div>
                {users.map((user) => (
                    <div
                        key={user.id}
                        className="grid grid-cols-[1.5fr_1fr_1fr] gap-4 border-t border-neutral-200 px-6 py-4 dark:border-neutral-800"
                    >
                        <div>
                            <p className="font-medium text-neutral-900 dark:text-white">{user.name || "Unnamed user"}</p>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">{user.email}</p>
                        </div>
                        <span className="text-sm text-neutral-700 dark:text-neutral-300">{formatStorage(user.storageUsed)}</span>
                        <span className="text-sm text-neutral-700 dark:text-neutral-300">{formatStorage(user.storageLimit)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
