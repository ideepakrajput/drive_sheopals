import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

type UserStorage = {
    id: string;
    email: string;
    name: string | null;
    storageUsed: number;
    storageLimit: number;
};

export const useMyStorage = () => {
    return useQuery({
        queryKey: ["my-storage"],
        queryFn: async () => {
            return await apiClient.get("/users/me/storage") as {
                storageUsed: number;
                storageLimit: number;
            };
        },
    });
};

export const useUsersStorage = (enabled = true) => {
    return useQuery({
        queryKey: ["users-storage"],
        queryFn: async () => {
            return await apiClient.get("/users/storage") as {
                users: UserStorage[];
            };
        },
        enabled,
    });
};

export const useUpdateUserStorage = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ userId, storageLimitBytes }: { userId: string; storageLimitBytes: number }) => {
            return await apiClient.patch("/users/storage", { userId, storageLimitBytes });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users-storage"] });
            queryClient.invalidateQueries({ queryKey: ["my-storage"] });
        },
    });
};
