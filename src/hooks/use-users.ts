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
        mutationFn: async ({ userId, storageLimitGb }: { userId: string; storageLimitGb: number }) => {
            return await apiClient.patch("/users/storage", { userId, storageLimitGb });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users-storage"] });
            queryClient.invalidateQueries({ queryKey: ["my-storage"] });
        },
    });
};

export const useCreateUser = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ name, email, storageLimitGb }: { name: string; email: string; storageLimitGb: number }) => {
            return await apiClient.post("/admin/users", { name, email, storageLimitGb });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users-storage"] });
        },
    });
};
