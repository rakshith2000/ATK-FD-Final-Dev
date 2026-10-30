import { configureStore } from '@reduxjs/toolkit';
import { appEnvConfig } from '@/config/app-env-config';

export const reduxStore = configureStore({
    reducer: {},
    devTools: appEnvConfig.isInDevelopmentMode,
});

export type RootState = ReturnType<typeof reduxStore.getState>;
export type AppDispatch = typeof reduxStore.dispatch;
