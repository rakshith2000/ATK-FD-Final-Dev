import axios from 'axios';
import { appConfig } from '@/config/app-config';
import { FASTEAI_SOP_BASE, getValidToken } from './fasteaiAuth';

export const fasteaiApiClient = axios.create({
    baseURL: FASTEAI_SOP_BASE,
});

fasteaiApiClient.interceptors.request.use(async (config) => {
    const token = await getValidToken(FASTEAI_SOP_BASE);
    config.headers.set('Authorization', `Bearer ${token}`);
    return config;
});

fasteaiApiClient.interceptors.response.use(
    (res) => res,
    async (error) => {
        const original = error.config;

        if (error.response?.status === 401 && !original._retry) {
            original._retry = true;
            try {
                const token = await getValidToken(FASTEAI_SOP_BASE);
                original.headers.set('Authorization', `Bearer ${token}`);
                return fasteaiApiClient(original);
            } catch (refreshError) {
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    },
);

const { baseUrl, schedulerBaseUrl } = appConfig.fasteai.api;
export const SCHEDULER_BASE = `${baseUrl}${schedulerBaseUrl}`;

export const schedulerAxios = axios.create({ baseURL: SCHEDULER_BASE });

schedulerAxios.interceptors.request.use(async (config) => {
    const token = await getValidToken();
    config.headers.set('Authorization', `Bearer ${token}`);
    return config;
});

schedulerAxios.interceptors.response.use(
    (res) => res,
    async (error) => {
        const original = error.config;
        if (error.response?.status === 401 && !original._retry) {
            original._retry = true;
            sessionStorage.removeItem('fasteai_jwt_token');
            const token = await getValidToken();
            original.headers.set('Authorization', `Bearer ${token}`);
            return schedulerAxios(original);
        }
        return Promise.reject(error);
    },
);

export default fasteaiApiClient;
