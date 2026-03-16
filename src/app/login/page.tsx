'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { useAdminLogin, useRequestOtp, useVerifyOtp } from '@/hooks/use-auth';

export default function LoginPage() {
    const router = useRouter();
    const [mode, setMode] = useState<'user' | 'admin'>('user');
    const [step, setStep] = useState<'email' | 'otp'>('email');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const { mutate: requestOtp, isPending: isRequestingOtp } = useRequestOtp();
    const { mutate: verifyOtp, isPending: isVerifyingOtp } = useVerifyOtp();
    const { mutate: adminLogin, isPending: isAdminLoggingIn } = useAdminLogin();

    const handleRequestOtp = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        requestOtp(email, {
            onSuccess: () => {
                setStep('otp');
                setError('');
            },
            onError: (err: Error) => {
                setError(err.message);
            },
        });
    };

    const handleVerifyOtp = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        verifyOtp({ email, otp }, {
            onSuccess: () => {
                router.push('/dashboard');
            },
            onError: (err: Error) => {
                setError(err.message);
            },
        });
    };

    const handleAdminLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        adminLogin({ email, password }, {
            onSuccess: () => {
                router.push('/admin/dashboard');
            },
            onError: (err: Error) => {
                setError(err.message);
            },
        });
    };

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-4 transition-colors">
            <div className="w-full max-w-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm p-8 transition-colors">
                <div className="mb-8">
                    <div className="w-10 h-10 bg-black dark:bg-white text-white dark:text-black rounded-lg flex items-center justify-center mb-6 shadow-sm">
                        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" x2="12" y1="3" y2="15" />
                        </svg>
                    </div>
                    <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 mb-1">Sign In</h1>
                    <p className="text-neutral-500 dark:text-neutral-400 text-sm">Continue to Sheopal&apos;s Drive</p>
                </div>

                <div className="mb-6 grid grid-cols-2 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
                    <button
                        type="button"
                        onClick={() => {
                            setMode('user');
                            setStep('email');
                            setError('');
                        }}
                        className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                            mode === 'user'
                                ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-900 dark:text-white'
                                : 'text-neutral-500 dark:text-neutral-400'
                        }`}
                    >
                        User OTP
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setMode('admin');
                            setStep('email');
                            setError('');
                        }}
                        className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                            mode === 'admin'
                                ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-900 dark:text-white'
                                : 'text-neutral-500 dark:text-neutral-400'
                        }`}
                    >
                        Admin
                    </button>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-lg text-center">
                        {error}
                    </div>
                )}

                {mode === 'admin' ? (
                    <form onSubmit={handleAdminLogin} className="space-y-5">
                        <div>
                            <label htmlFor="admin-email" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                                Admin Email
                            </label>
                            <input
                                id="admin-email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all"
                                placeholder="admin@sheopals.in"
                            />
                        </div>
                        <div>
                            <label htmlFor="admin-password" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                                Password
                            </label>
                            <input
                                id="admin-password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all"
                                placeholder="Enter admin password"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isAdminLoggingIn || !email || !password}
                            className="w-full flex justify-center items-center py-2.5 px-4 rounded-xl shadow-sm text-sm font-medium text-white dark:text-black bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black dark:focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {isAdminLoggingIn ? (
                                <Loader2 className="animate-spin h-5 w-5" />
                            ) : (
                                <>
                                    Admin Login <ShieldCheck className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </button>
                    </form>
                ) : step === 'email' ? (
                    <form onSubmit={handleRequestOtp} className="space-y-5">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                                Email Address
                            </label>
                            <input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all"
                                placeholder="name@company.com"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isRequestingOtp || !email}
                            className="w-full flex justify-center items-center py-2.5 px-4 rounded-xl shadow-sm text-sm font-medium text-white dark:text-black bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black dark:focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {isRequestingOtp ? (
                                <Loader2 className="animate-spin h-5 w-5" />
                            ) : (
                                <>
                                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOtp} className="space-y-5">
                        <div>
                            <label htmlFor="otp" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 flex justify-between items-center">
                                <span>Enter Code</span>
                                <button
                                    type="button"
                                    onClick={() => setStep('email')}
                                    className="text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white text-xs font-medium transition-colors"
                                >
                                    Change email
                                </button>
                            </label>
                            <input
                                id="otp"
                                type="text"
                                required
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                className="block w-full bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all tracking-[0.5em] text-center font-mono text-lg"
                                placeholder="000000"
                                maxLength={6}
                            />
                            <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-500 text-center">
                                We sent a secure code to your email. Only users added by the admin can log in.
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={isVerifyingOtp || otp.length < 6}
                            className="w-full flex justify-center items-center py-2.5 px-4 rounded-xl shadow-sm text-sm font-medium text-white dark:text-black bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black dark:focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {isVerifyingOtp ? <Loader2 className="animate-spin h-5 w-5" /> : 'Sign In'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
