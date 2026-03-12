import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export const useUploadFile = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ file, folderId, relativePath }: { file: File; folderId?: string | null; relativePath?: string }) => {
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
            });
        },
        onSuccess: () => {
             // We can invalidate specific queries here if we implement query hooks for files later
             // queryClient.invalidateQueries({ queryKey: ['files'] });
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
