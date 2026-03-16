"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Settings } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateUser, useUpdateUserStorage, useUsersStorage } from "@/hooks/use-users";

type LimitDrafts = Record<string, string>;

function formatStorage(bytes: number) {
    if (bytes >= 1024 * 1024 * 1024) {
        return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
    }

    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function StorageAdminPanel() {
    const { data, isLoading } = useUsersStorage();
    const { mutateAsync: updateUserStorageAsync, isPending } = useUpdateUserStorage();
    const { mutateAsync: createUserAsync, isPending: isCreatingUser } = useCreateUser();
    const [search, setSearch] = useState("");
    const [limitDrafts, setLimitDrafts] = useState<LimitDrafts>({});
    const [newUserName, setNewUserName] = useState("");
    const [newUserEmail, setNewUserEmail] = useState("");
    const [newUserLimitGb, setNewUserLimitGb] = useState("5");
    const users = data?.users || [];

    useEffect(() => {
        if (users.length === 0) {
            return;
        }

        setLimitDrafts((current) => {
            const next = { ...current };
            for (const user of users) {
                if (!(user.id in next)) {
                    next[user.id] = (user.storageLimit / 1024 / 1024 / 1024).toFixed(2);
                }
            }
            return next;
        });
    }, [users]);

    const filteredUsers = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) {
            return users;
        }

        return users.filter((user) =>
            `${user.name || ""} ${user.email}`.toLowerCase().includes(query)
        );
    }, [search, users]);

    const handleSave = async (userId: string) => {
        const draftValue = Number(limitDrafts[userId]);
        if (!Number.isFinite(draftValue) || draftValue <= 0) {
            toast.error("Enter a valid storage limit in GB");
            return;
        }

        const toastId = toast.loading("Updating storage limit...");

        try {
            await updateUserStorageAsync({
                userId,
                storageLimitGb: draftValue,
            });
            toast.success("Storage limit updated", { id: toastId });
        } catch (error: any) {
            toast.error(error.message || "Failed to update storage limit", { id: toastId });
        }
    };

    const handleCreateUser = async (event: React.FormEvent) => {
        event.preventDefault();

        const parsedLimit = Number(newUserLimitGb);
        if (!newUserEmail.trim()) {
            toast.error("Email is required");
            return;
        }

        if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
            toast.error("Enter a valid storage limit in GB");
            return;
        }

        const toastId = toast.loading("Creating user...");

        try {
            await createUserAsync({
                name: newUserName.trim(),
                email: newUserEmail.trim(),
                storageLimitGb: parsedLimit,
            });
            setNewUserName("");
            setNewUserEmail("");
            setNewUserLimitGb("5");
            toast.success("User created", { id: toastId });
        } catch (error: any) {
            toast.error(error.message || "Failed to create user", { id: toastId });
        }
    };

    return (
        <div className="p-8 space-y-8">
            <div className="space-y-3">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-white dark:bg-white dark:text-black">
                    <Settings className="h-5 w-5" />
                </div>
                <div>
                    <h1 className="text-3xl font-semibold text-neutral-900 dark:text-white">Storage Admin Panel</h1>
                    <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                        Limits are entered in GB and converted to bytes in the backend before saving.
                    </p>
                </div>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                <div className="mb-5">
                    <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Add User</h2>
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                        Only users created here can sign in with OTP.
                    </p>
                </div>
                <form onSubmit={handleCreateUser} className="grid gap-4 md:grid-cols-[1fr_1fr_180px_auto]">
                    <Input
                        value={newUserName}
                        onChange={(event) => setNewUserName(event.target.value)}
                        placeholder="Full name"
                        disabled={isCreatingUser}
                    />
                    <Input
                        type="email"
                        value={newUserEmail}
                        onChange={(event) => setNewUserEmail(event.target.value)}
                        placeholder="user@sheopals.in"
                        disabled={isCreatingUser}
                        required
                    />
                    <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={newUserLimitGb}
                        onChange={(event) => setNewUserLimitGb(event.target.value)}
                        placeholder="Storage GB"
                        disabled={isCreatingUser}
                    />
                    <Button type="submit" disabled={isCreatingUser}>
                        {isCreatingUser ? "Adding..." : "Add User"}
                    </Button>
                </form>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950">
                    <Search className="h-4 w-4 text-neutral-400" />
                    <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search users by name or email..."
                        className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                    />
                </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_auto] gap-4 border-b border-neutral-200 px-6 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                    <span>User</span>
                    <span>Used</span>
                    <span>Available</span>
                    <span>Limit (GB)</span>
                    <span>Action</span>
                </div>

                {isLoading ? (
                    <div className="px-6 py-8 text-sm text-neutral-500 dark:text-neutral-400">
                        Loading users...
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="px-6 py-8 text-sm text-neutral-500 dark:text-neutral-400">
                        No users found.
                    </div>
                ) : (
                    filteredUsers.map((user) => {
                        const remaining = Math.max(user.storageLimit - user.storageUsed, 0);
                        const usagePercent = Math.min((user.storageUsed / Math.max(user.storageLimit, 1)) * 100, 100);

                        return (
                            <div
                                key={user.id}
                                className="grid grid-cols-[1.5fr_1fr_1fr_1fr_auto] items-center gap-4 border-b border-neutral-200 px-6 py-5 last:border-b-0 dark:border-neutral-800"
                            >
                                <div className="space-y-1">
                                    <p className="font-medium text-neutral-900 dark:text-white">{user.name || "Unnamed user"}</p>
                                    <p className="text-sm text-neutral-500 dark:text-neutral-400">{user.email}</p>
                                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                                        <div
                                            className="h-full rounded-full bg-black transition-all dark:bg-white"
                                            style={{ width: `${usagePercent}%` }}
                                        />
                                    </div>
                                </div>
                                <span className="text-sm text-neutral-700 dark:text-neutral-300">{formatStorage(user.storageUsed)}</span>
                                <span className="text-sm text-neutral-700 dark:text-neutral-300">{formatStorage(remaining)}</span>
                                <Input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={limitDrafts[user.id] || ""}
                                    onChange={(event) =>
                                        setLimitDrafts((current) => ({
                                            ...current,
                                            [user.id]: event.target.value,
                                        }))
                                    }
                                    disabled={isPending}
                                />
                                <Button onClick={() => handleSave(user.id)} disabled={isPending}>
                                    Save
                                </Button>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
