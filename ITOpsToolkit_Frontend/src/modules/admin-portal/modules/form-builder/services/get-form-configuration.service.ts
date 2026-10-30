import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { appConfig } from '@/config/app-config';
import logger from '@/shared/utils/logger';
import { isAxiosError } from 'axios';
import createFormConfigurationService from './create-form-configuration.service';
import seeders from '../seeders';
import type { FormConfigRecord } from '../types/form-config';

function getFormConfigurationService({ form_name }: { form_name: string }): Promise<FormConfigRecord> {
    return withApiResponseHandler<FormConfigRecord>(async () => {
        try {
            const response = await backendApiClient.get(appConfig.backend.api.get_form_configuration.replaceAll('<FORM_NAME_PLACEHOLDER>', form_name));

            if (response?.data?.output?.data?.form) {
                return response?.data?.output?.data?.form as FormConfigRecord;
            } else {
                throw new Error('response?.data?.output?.data?.form from the api response !');
            }
        } catch (error: unknown) {
            if (isAxiosError(error) && error.isAxiosError && error?.response?.data?.code === 404) {
                logger.info(`${form_name} is not found in API, seeding the form !`);

                const seeder: FormConfigRecord | undefined = seeders?.[form_name as unknown as keyof typeof seeders];

                if (!seeder) {
                    throw new Error(`Form seeder not found for ${form_name}`);
                }

                await createFormConfigurationService({ form_name: form_name, form_config: seeder });

                return getFormConfigurationService({ form_name });
            } else {
                throw error;
            }
        }
    });
}

export default getFormConfigurationService;
