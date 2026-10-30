import queryClient from '@/react-query-client';
import { QueryClientProvider } from '@tanstack/react-query';

const TanstackQueryClientProvider = ({ children }: { children: React.ReactNode }) => {
    return QueryClientProvider({
        client: queryClient,
        children: children,
    });
};

export default TanstackQueryClientProvider;
