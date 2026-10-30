import queryClient from '@/react-query-client';

export async function clearAllQueries() {
    await queryClient.cancelQueries();
    queryClient.clear();
    queryClient.unmount();
}
