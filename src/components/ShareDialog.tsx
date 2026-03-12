"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api-client";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

type ShareEntry = {
    shared_with_user_id: string;
    email: string;
    name: string | null;
    permission: "view" | "edit";
};

type UserOption = {
    id: string;
    email: string;
    name: string | null;
};

type ShareDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    loadShares: () => Promise<{ shares?: ShareEntry[] }>;
    createShare: (payload: { email: string; permission: "view" | "edit" }) => Promise<{ shares?: ShareEntry[] }>;
    removeShare: (payload: { sharedWithUserId: string }) => Promise<{ shares?: ShareEntry[] }>;
};

export default function ShareDialog({
    open,
    onOpenChange,
    title,
    description,
    loadShares,
    createShare,
    removeShare,
}: ShareDialogProps) {
    const [selectedEmail, setSelectedEmail] = useState("");
    const [permission, setPermission] = useState<"view" | "edit">("view");
    const [shares, setShares] = useState<ShareEntry[]>([]);
    const [users, setUsers] = useState<UserOption[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const loadSharesRef = useRef(loadShares);
    const createShareRef = useRef(createShare);
    const removeShareRef = useRef(removeShare);

    useEffect(() => {
        loadSharesRef.current = loadShares;
        createShareRef.current = createShare;
        removeShareRef.current = removeShare;
    }, [loadShares, createShare, removeShare]);

    useEffect(() => {
        if (!open) {
            return;
        }

        const fetchShares = async () => {
            setIsLoading(true);
            try {
                const [shareResponse, userResponse] = await Promise.all([
                    loadSharesRef.current(),
                    apiClient.get("/users") as Promise<{ users?: UserOption[] }>,
                ]);
                setShares(shareResponse.shares || []);
                setUsers(userResponse.users || []);
            } catch (error: any) {
                toast.error(error.message || "Failed to load sharing data");
            } finally {
                setIsLoading(false);
            }
        };

        fetchShares();
    }, [open]);

    const handleShare = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEmail) {
            return;
        }

        setIsSubmitting(true);
        const toastId = toast.loading("Updating sharing...");
        try {
            const response = await createShareRef.current({ email: selectedEmail, permission });
            setShares(response.shares || []);
            setSelectedEmail("");
            toast.success("Sharing updated", { id: toastId });
        } catch (error: any) {
            toast.error(error.message || "Failed to share item", { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemove = async (sharedWithUserId: string) => {
        const toastId = toast.loading("Removing access...");
        try {
            const response = await removeShareRef.current({ sharedWithUserId });
            setShares(response.shares || []);
            toast.success("Access removed", { id: toastId });
        } catch (error: any) {
            toast.error(error.message || "Failed to remove access", { id: toastId });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent onClick={(e) => e.stopPropagation()} className="bg-background/80 backdrop-blur-xl border-border/50 text-foreground z-[140] shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        {description}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleShare} className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="share-user" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            User
                        </Label>
                        <select
                            id="share-user"
                            value={selectedEmail}
                            onChange={(e) => setSelectedEmail(e.target.value)}
                            className="flex h-11 w-full rounded-md border border-border/50 bg-background/50 px-3 py-2 text-sm text-foreground outline-none"
                        >
                            <option value="">Select a user</option>
                            {users.map((user) => (
                                <option key={user.id} value={user.email}>
                                    {user.name ? `${user.name} (${user.email})` : user.email}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="share-permission" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Permission
                        </Label>
                        <select
                            id="share-permission"
                            value={permission}
                            onChange={(e) => setPermission(e.target.value as "view" | "edit")}
                            className="flex h-11 w-full rounded-md border border-border/50 bg-background/50 px-3 py-2 text-sm text-foreground outline-none"
                        >
                            <option value="view">View</option>
                            <option value="edit">Edit</option>
                        </select>
                    </div>

                    <DialogFooter className="border-t border-border/10 pt-4 bg-transparent">
                        <Button type="submit" disabled={isSubmitting || !selectedEmail} className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 font-medium">
                            {isSubmitting ? "Sharing..." : "Share"}
                        </Button>
                    </DialogFooter>
                </form>

                <div className="border-t border-border/10 pt-4">
                    <div className="mb-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">People with access</div>
                    {isLoading ? (
                        <p className="text-sm text-muted-foreground">Loading access list...</p>
                    ) : shares.length === 0 ? (
                        <p className="text-sm text-muted-foreground">This item has not been shared yet.</p>
                    ) : (
                        <div className="space-y-2">
                            {shares.map((share) => (
                                <div key={share.shared_with_user_id} className="flex items-center justify-between rounded-lg border border-border/30 bg-muted/20 px-3 py-2">
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-medium text-foreground">
                                            {share.name || share.email}
                                        </div>
                                        <div className="truncate text-xs text-muted-foreground">
                                            {share.email} - {share.permission}
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => handleRemove(share.shared_with_user_id)}
                                        className="text-red-500 hover:bg-red-500/10 hover:text-red-500"
                                    >
                                        Remove
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
