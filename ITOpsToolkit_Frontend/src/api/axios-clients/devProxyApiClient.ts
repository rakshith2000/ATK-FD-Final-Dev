import logger from '@/shared/utils/logger';
import axios from 'axios';

const devProxyApiClient = axios.create({
    baseURL: '',
    headers: {
        'Content-Type': 'application/json',
    },
});

devProxyApiClient.interceptors.request.use((config) => {
    logger.debug('[DEV Proxy Axios]', devProxyApiClient.getUri(config));
    return config;
});

export default devProxyApiClient;
