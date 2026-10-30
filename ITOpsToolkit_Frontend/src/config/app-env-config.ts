import envSchema from '../../env.schema';

const raw = import.meta.env;

const validatedAppEnvConfig = envSchema.parse(raw);

export interface AppEnvConfig {
    isInDevelopmentMode: boolean;
    applicationBasepath: string;
    enableDocsPage: boolean;
    enableDevSpacePage: boolean;
    enableSiteMapPage: boolean;
}

export const appEnvConfig: AppEnvConfig = {
    isInDevelopmentMode: validatedAppEnvConfig.VITE_APP_PIPELINE_STAGE === 'development',
    applicationBasepath: validatedAppEnvConfig.VITE_APP_BASE_PATH,
    enableDocsPage: validatedAppEnvConfig.VITE_ENABLE_DOCS_PAGE === 'true',
    enableDevSpacePage: validatedAppEnvConfig.VITE_ENABLE_DEV_SPACE_PAGE === 'true',
    enableSiteMapPage: validatedAppEnvConfig.VITE_ENABLE_SITE_MAP_PAGE === 'true',
};
