'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    FolderIcon,
    Clock,
    Users,
    Star,
    Trash2,
    Cloud,
    PanelLeftClose,
    PanelLeftOpen,
    Plus,
} from 'lucide-react';
import { NewItemButton } from '@/components/NewItemButton';
import { useMyStorage } from '@/hooks/use-users';

const navigation = [
    { name: 'My Files', href: '/dashboard', icon: FolderIcon },
    { name: 'Recent', href: '/dashboard/recent', icon: Clock },
    { name: 'Shared', href: '/dashboard/shared', icon: Users },
    { name: 'Starred', href: '/dashboard/starred', icon: Star },
    { name: 'Trash', href: '/dashboard/trash', icon: Trash2 },
];

export function Sidebar() {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(() => {
        if (typeof window === 'undefined') {
            return false;
        }

        return window.localStorage.getItem('drive-sidebar-collapsed') === 'true';
    });
    const folderIdMatch = pathname?.match(/\/dashboard\/folders\/([^\/]+)/);
    const currentFolderId = folderIdMatch ? folderIdMatch[1] : null;
    const { data, isLoading } = useMyStorage();
    const storageUsed = Number(data?.storageUsed || 0);
    const storageLimit = Number(data?.storageLimit || 0);
    const usagePercent = storageLimit > 0
        ? Math.min((storageUsed / storageLimit) * 100, 100)
        : 0;

    const formatStorage = (bytes: number) => {
        if (bytes >= 1024 * 1024 * 1024) {
            return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
        }

        return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    };

    const handleToggleSidebar = () => {
        setIsCollapsed((currentValue) => {
            const nextValue = !currentValue;
            window.localStorage.setItem('drive-sidebar-collapsed', String(nextValue));
            return nextValue;
        });
    };

    return (
        <div
            className={`hidden h-full flex-col border-r border-neutral-200 bg-neutral-50 transition-[width,colors] dark:border-neutral-800 dark:bg-neutral-950 md:flex ${isCollapsed ? 'w-20' : 'w-64'}`}
        >
            <div className={`${isCollapsed ? 'flex flex-col items-center gap-4 p-4' : 'flex items-center justify-between gap-3 p-6'}`}>
                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'min-w-0 space-x-3'}`}>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-white shadow-sm dark:bg-white dark:text-black">
                        <Cloud className="h-5 w-5" />
                    </div>
                    {!isCollapsed ? (
                        <span className="text-lg font-semibold text-neutral-900 dark:text-white">
                            Sheopal&apos;s Drive
                        </span>
                    ) : null}
                </div>
                <button
                    type="button"
                    onClick={handleToggleSidebar}
                    title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
                >
                    {isCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
                </button>
            </div>

            <div className={isCollapsed ? 'px-3 pb-4' : 'px-4 pb-6'}>
                {isCollapsed ? (
                    <button
                        type="button"
                        title="New"
                        className="flex h-12 w-full items-center justify-center rounded-xl bg-black text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
                    >
                        <Plus className="h-5 w-5" />
                    </button>
                ) : (
                    <NewItemButton folderId={currentFolderId} />
                )}
            </div>

            <nav className={`flex-1 overflow-y-auto ${isCollapsed ? 'space-y-2 px-2' : 'space-y-1 px-3'}`}>
                {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            title={isCollapsed ? item.name : undefined}
                            className={`flex items-center rounded-lg text-sm font-medium transition-colors ${isCollapsed ? 'justify-center px-3 py-3' : 'space-x-3 px-3 py-2.5'} ${isActive
                                ? 'bg-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:text-white'
                                : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white'
                                }`}
                        >
                            <item.icon className="h-5 w-5 shrink-0" />
                            {!isCollapsed ? <span>{item.name}</span> : null}
                        </Link>
                    );
                })}
            </nav>

            <div className={`border-t border-neutral-200 py-4 dark:border-neutral-800 ${isCollapsed ? 'px-3' : 'space-y-2 px-4'}`}>
                {isCollapsed ? (
                    <div
                        title={isLoading || storageLimit <= 0
                            ? 'Loading storage...'
                            : `${formatStorage(storageUsed)} of ${formatStorage(storageLimit)} used`}
                        className="flex justify-center"
                    >
                        <div className="relative h-11 w-11 rounded-full bg-neutral-200 dark:bg-neutral-800">
                            <div
                                className="absolute inset-0 rounded-full"
                                style={{
                                    background: `conic-gradient(rgb(0 0 0) ${usagePercent}%, transparent 0%)`,
                                    opacity: 0.9,
                                }}
                            />
                            <div className="absolute inset-[5px] rounded-full bg-neutral-50 dark:bg-neutral-950" />
                            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-neutral-700 dark:text-neutral-200">
                                {usagePercent.toFixed(0)}%
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
                            <span>Storage</span>
                            <span>{usagePercent.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                            <div
                                className="h-full rounded-full bg-black transition-all dark:bg-white"
                                style={{ width: `${usagePercent}%` }}
                            />
                        </div>
                        <p className="text-sm text-neutral-600 dark:text-neutral-300">
                            {isLoading || storageLimit <= 0
                                ? 'Loading storage...'
                                : `${formatStorage(storageUsed)} of ${formatStorage(storageLimit)} used`}
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
