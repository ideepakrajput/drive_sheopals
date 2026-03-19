import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosProgressEvent } from 'axios';
import { apiClient } from '@/lib/api-client';

type UploadFileInput = {
    file: File;
    folderId?: string | null;
    relativePath?: string;
    signal?: AbortSignal;
    onUploadProgress?: (progressEvent: AxiosProgressEvent) => void;
};

const invalidateDriveQueries = (queryClient: ReturnType<typeof useQueryClient>) => {
    queryClient.invalidateQueries({ queryKey: ['my-storage'] });
    queryClient.invalidateQueries({ queryKey: ['users-storage'] });
};

export const useUploadFile = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ file, folderId, relativePath, signal, onUploadProgress }: UploadFileInput) => {
            const formData = new FormData();
            formData.append('file', file);
            if (folderId) {
                formData.append('folderId', folderId);
            }
            if (relativePath) {
                formData.append('relativePath', relativePath);
            }

            return await apiClient.post('/files/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                signal,
                onUploadProgress,
            });
        },
        onSuccess: () => {
            invalidateDriveQueries(queryClient);
        }
    });
};
export const useRenameFile = () => {
    return useMutation({
        mutationFn: async ({ id, name }: { id: string; name: string }) => {
            return await apiClient.patch(`/files/${id}`, { name });
        }
    });
};

export const useStarFile = () => {
    return useMutation({
        mutationFn: async ({ id, starred }: { id: string; starred: boolean }) => {
            return await apiClient.post(`/files/${id}/star`, { starred });
        }
    });
};

export const useTrashFile = () => {
    return useMutation({
        mutationFn: async (id: string) => {
            return await apiClient.post(`/files/${id}/trash`);
        }
    });
};

export const useRenameFolder = () => {
    return useMutation({
        mutationFn: async ({ id, name }: { id: string; name: string }) => {
            return await apiClient.patch(`/folders/${id}`, { name });
        }
    });
};

export const useTrashFolder = () => {
    return useMutation({
        mutationFn: async (id: string) => {
            return await apiClient.post(`/folders/${id}/trash`);
        }
    });
};

export const useRestoreFile = () => {
    return useMutation({
        mutationFn: async (id: string) => {
            return await apiClient.post(`/files/${id}/restore`);
        }
    });
};

export const useDeleteFile = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            return await apiClient.delete(`/files/${id}`);
        },
        onSuccess: () => {
            invalidateDriveQueries(queryClient);
        },
    });
};

export const useRestoreFolder = () => {
    return useMutation({
        mutationFn: async (id: string) => {
            return await apiClient.post(`/folders/${id}/restore`);
        }
    });
};

export const useDeleteFolder = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            return await apiClient.delete(`/folders/${id}`);
        },
        onSuccess: () => {
            invalidateDriveQueries(queryClient);
        },
    });
};

export const useListFolderOptions = () => {
    return useMutation({
        mutationFn: async () => {
            return await apiClient.get('/folders/options');
        }
    });
};

export const useMoveFile = () => {
    return useMutation({
        mutationFn: async ({ id, destinationFolderId }: { id: string; destinationFolderId: string | null }) => {
            return await apiClient.post(`/files/${id}/move`, { destinationFolderId });
        }
    });
};

export const useCopyFile = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, destinationFolderId }: { id: string; destinationFolderId: string | null }) => {
            return await apiClient.post(`/files/${id}/copy`, { destinationFolderId });
        },
        onSuccess: () => {
            invalidateDriveQueries(queryClient);
        },
    });
};

export const useMoveFolder = () => {
    return useMutation({
        mutationFn: async ({ id, destinationFolderId }: { id: string; destinationFolderId: string | null }) => {
            return await apiClient.post(`/folders/${id}/move`, { destinationFolderId });
        }
    });
};

export const useCopyFolder = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, destinationFolderId }: { id: string; destinationFolderId: string | null }) => {
            return await apiClient.post(`/folders/${id}/copy`, { destinationFolderId });
        },
        onSuccess: () => {
            invalidateDriveQueries(queryClient);
        },
    });
};

export const useListFileShares = () => {
    return useMutation({
        mutationFn: async (id: string) => {
            return await apiClient.get(`/files/${id}/share`);
        }
    });
};

export const useShareFile = () => {
    return useMutation({
        mutationFn: async ({ id, email, permission }: { id: string; email: string; permission: 'view' | 'edit' }) => {
            return await apiClient.post(`/files/${id}/share`, { email, permission });
        }
    });
};

export const useUnshareFile = () => {
    return useMutation({
        mutationFn: async ({ id, sharedWithUserId }: { id: string; sharedWithUserId: string }) => {
            return await apiClient.delete(`/files/${id}/share`, { data: { sharedWithUserId } });
        }
    });
};

export const useListFolderShares = () => {
    return useMutation({
        mutationFn: async (id: string) => {
            return await apiClient.get(`/folders/${id}/share`);
        }
    });
};

export const useShareFolder = () => {
    return useMutation({
        mutationFn: async ({ id, email, permission }: { id: string; email: string; permission: 'view' | 'edit' }) => {
            return await apiClient.post(`/folders/${id}/share`, { email, permission });
        }
    });
};

export const useUnshareFolder = () => {
    return useMutation({
        mutationFn: async ({ id, sharedWithUserId }: { id: string; sharedWithUserId: string }) => {
            return await apiClient.delete(`/folders/${id}/share`, { data: { sharedWithUserId } });
        }
    });
};
