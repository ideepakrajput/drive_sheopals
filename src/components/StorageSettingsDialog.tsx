"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useUpdateUserStorage, useUsersStorage } from "@/hooks/use-users";

type StorageSettingsDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

function formatStorage(bytes: number) {
    if (bytes >= 1024 * 1024 * 1024) {
        return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
    }

    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function StorageSettingsDialog({ open, onOpenChange }: StorageSettingsDialogProps) {
    const { data, isLoading } = useUsersStorage(open);
    const { mutateAsync: updateUserStorageAsync, isPending } = useUpdateUserStorage();
    const users = data?.users || [];
    const [selectedUserId, setSelectedUserId] = useState("");
    const [storageLimitGb, setStorageLimitGb] = useState("");

    useEffect(() => {
        if (!open || users.length === 0) {
            return;
        }

        setSelectedUserId((current) => current || users[0].id);
    }, [open, users]);

    const selectedUser = useMemo(
        () => users.find((user) => user.id === selectedUserId) || null,
        [users, selectedUserId]
    );

    useEffect(() => {
        if (!selectedUser) {
            return;
        }

        setStorageLimitGb((selectedUser.storageLimit / 1024 / 1024 / 1024).toFixed(2));
    }, [selectedUser]);

    const usagePercent = selectedUser
        ? Math.min((selectedUser.storageUsed / Math.max(selectedUser.storageLimit, 1)) * 100, 100)
        : 0;

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!selectedUser) {
            return;
        }

        const parsedLimit = Number(storageLimitGb);
        if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
            toast.error("Enter a valid storage limit in GB");
            return;
        }

        const toastId = toast.loading("Updating storage limit...");

        try {
            await updateUserStorageAsync({
                userId: selectedUser.id,
                storageLimitGb: parsedLimit,
            });
            toast.success("Storage limit updated", { id: toastId });
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.message || "Failed to update storage limit", { id: toastId });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[520px] bg-background/80 backdrop-blur-xl border-border/50 text-foreground shadow-2xl">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold">Storage Settings</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Assign per-user storage limits and review current usage.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                        <Label htmlFor="storage-user">User</Label>
                        <select
                            id="storage-user"
                            value={selectedUserId}
                            onChange={(event) => setSelectedUserId(event.target.value)}
                            disabled={isLoading || isPending || users.length === 0}
                            className="flex h-11 w-full rounded-md border border-border/50 bg-background/50 px-3 py-2 text-sm text-foreground outline-none"
                        >
                            {users.map((user) => (
                                <option key={user.id} value={user.id}>
                                    {user.name || user.email} ({user.email})
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedUser && (
                        <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
                            <div className="flex items-center justify-between gap-3 text-sm">
                                <span className="font-medium text-foreground">Usage</span>
                                <span className="text-muted-foreground">
                                    {formatStorage(selectedUser.storageUsed)} of {formatStorage(selectedUser.storageLimit)}
                                </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-muted">
                                <div
                                    className="h-full rounded-full bg-primary transition-all"
                                    style={{ width: `${usagePercent}%` }}
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="storage-limit">Storage Limit (GB)</Label>
                        <Input
                            id="storage-limit"
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={storageLimitGb}
                            onChange={(event) => setStorageLimitGb(event.target.value)}
                            disabled={!selectedUser || isPending}
                            placeholder="5.00"
                        />
                    </div>

                    <DialogFooter className="border-t border-border/10 pt-4 bg-transparent">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!selectedUser || isPending}>
                            {isPending ? "Saving..." : "Save"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
