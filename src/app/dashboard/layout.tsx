import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen bg-white dark:bg-neutral-950 overflow-hidden text-neutral-900 dark:text-neutral-200 transition-colors">
            <Sidebar />
            <div className="flex flex-col flex-1 w-0 overflow-hidden">
                <Header />
                <main className="flex-1 relative overflow-y-auto focus:outline-none bg-neutral-50 dark:bg-neutral-950">
                    {children}
                </main>
            </div>
        </div>
    );
}
