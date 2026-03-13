'use client';

import {
    Search,
    Bell,
    Settings,
    LogOut,
    Sun,
    Moon
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function Header() {
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleLogout = async () => {
        // We could make an API call to clear the cookie, but for simplicity we can just clear it client side 
        // Wait, HTTPOnly cookies need to be cleared by server.
        // Let's create a quick API route or just fetch a logout endpoint.
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
    };

    return (
        <header className="h-16 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center justify-between px-6 z-10 transition-colors">
            <div className="flex-1 flex max-w-2xl">
                <div className="relative w-full max-w-md hidden sm:block">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-neutral-200 dark:border-neutral-800 rounded-xl leading-5 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-300 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:bg-white dark:focus:bg-neutral-900 focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black dark:focus:ring-white sm:text-sm transition-all shadow-sm"
                        placeholder="Search in Sheopal's Drive..."
                    />
                </div>
            </div>
            <div className="flex items-center space-x-4">
                <button className="text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors">
                    <Settings className="w-5 h-5" />
                </button>
                <button className="text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors">
                    <Bell className="w-5 h-5" />
                </button>
                {mounted && (
                    <button
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        className="text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
                        title="Toggle Theme"
                    >
                        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>
                )}
                <div className="h-8 w-8 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 flex items-center justify-center font-semibold cursor-pointer select-none">
                    D
                </div>
                <button
                    onClick={handleLogout}
                    className="text-neutral-400 dark:text-neutral-500 hover:text-red-500 dark:hover:text-red-400 transition-colors ml-4"
                    title="Logout"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </div>
        </header>
    );
}
