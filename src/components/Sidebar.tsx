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
import { NewItemButton } from '@/components/NewItemButton';

const navigation = [
    { name: 'My Files', href: '/dashboard', icon: FolderIcon },
    { name: 'Recent', href: '/dashboard/recent', icon: Clock },
    { name: 'Shared', href: '/dashboard/shared', icon: Users },
    { name: 'Starred', href: '/dashboard/starred', icon: Star },
    { name: 'Trash', href: '/dashboard/trash', icon: Trash2 },
];

export function Sidebar() {
    const pathname = usePathname();
    const folderIdMatch = pathname?.match(/\/dashboard\/folders\/([^\/]+)/);
    const currentFolderId = folderIdMatch ? folderIdMatch[1] : null;

    return (
        <div className="w-64 bg-neutral-50 dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800 flex flex-col h-full hidden md:flex transition-colors">
            <div className="p-6 flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-black dark:bg-white flex items-center justify-center text-white dark:text-black shadow-sm">
                    <Cloud className="w-5 h-5" />
                </div>
                <span className="text-neutral-900 dark:text-white font-semibold text-lg tracking-wide">Drive</span>
            </div>

            <div className="px-4 pb-6">
                <NewItemButton folderId={currentFolderId} />
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


        </div>
    );
}
