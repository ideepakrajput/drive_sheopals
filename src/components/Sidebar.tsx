'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    FolderIcon,
    Clock,
    Users,
    Star,
    Trash2,
    Cloud,
    Plus
} from 'lucide-react';

const navigation = [
    { name: 'My Files', href: '/dashboard', icon: FolderIcon },
    { name: 'Recent', href: '/dashboard/recent', icon: Clock },
    { name: 'Shared', href: '/dashboard/shared', icon: Users },
    { name: 'Starred', href: '/dashboard/starred', icon: Star },
    { name: 'Trash', href: '/dashboard/trash', icon: Trash2 },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="w-64 bg-neutral-50 dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800 flex flex-col h-full hidden md:flex transition-colors">
            <div className="p-6 flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-black dark:bg-white flex items-center justify-center text-white dark:text-black shadow-sm">
                    <Cloud className="w-5 h-5" />
                </div>
                <span className="text-neutral-900 dark:text-white font-semibold text-lg tracking-wide">Drive</span>
            </div>

            <div className="px-4 pb-6">
                <button className="w-full flex items-center justify-center space-x-2 bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-black p-3 rounded-xl transition-colors shadow-sm font-medium">
                    <Plus className="w-5 h-5" />
                    <span>New</span>
                </button>
            </div>

            <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
                {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                                ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white'
                                : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white'
                                }`}
                        >
                            <item.icon className="w-5 h-5" />
                            <span>{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-neutral-200 dark:border-neutral-800">
                <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-lg p-4 shadow-sm">
                    <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-2 flex justify-between font-medium">
                        <span>Storage</span>
                        <span>75%</span>
                    </div>
                    <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <div className="h-full bg-black dark:bg-white rounded-full" style={{ width: '75%' }} />
                    </div>
                    <div className="text-xs text-neutral-400 dark:text-neutral-500 mt-2">
                        15 GB of 20 GB used
                    </div>
                </div>
            </div>
        </div>
    );
}
