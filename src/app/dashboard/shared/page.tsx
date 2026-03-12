import { Users } from 'lucide-react';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function SharedPage() {
    const session = await getSession();
    if (!session) {
        redirect('/login');
    }

    return (
        <div className="p-8">
            <div className="mb-8 flex items-center justify-between">
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight flex items-center">
                    <Users className="mr-3 text-emerald-500 w-6 h-6" />
                    Shared with me
                </h1>
            </div>

            <div className="flex flex-col items-center justify-center h-64 text-neutral-500 text-center">
                <div className="w-20 h-20 mb-6 bg-emerald-500/10 rounded-full flex items-center justify-center">
                    <Users className="w-10 h-10 text-emerald-500/30" />
                </div>
                <h2 className="text-lg text-neutral-900 dark:text-neutral-400 font-medium">No shared items</h2>
                <p className="text-sm mt-1 text-neutral-500 max-w-xs">
                    Files and folders shared with you by others will appear here.
                </p>
            </div>
        </div>
    );
}
