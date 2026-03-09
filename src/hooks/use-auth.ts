import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export const useRequestOtp = () => {
    return useMutation({
        mutationFn: async (email: string) => {
            // The apiClient interceptor extracts response.data, so it returns the JSON body directly.
            return await apiClient.post('/auth/request-otp', { email });
        },
    });
};

export const useVerifyOtp = () => {
    return useMutation({
        mutationFn: async ({ email, otp }: { email: string; otp: string }) => {
            return await apiClient.post('/auth/verify-otp', { email, otp });
        },
    });
};
