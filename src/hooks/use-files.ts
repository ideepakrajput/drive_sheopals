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
