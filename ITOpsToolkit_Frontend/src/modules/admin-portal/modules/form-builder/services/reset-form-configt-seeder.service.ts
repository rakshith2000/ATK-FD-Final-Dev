import { withApiResponseHandler } from '@/api/utils/with-api-response-handler-hof';
import deleteFormConfigurationService from './delete-form-configuration';
import getFormConfigurationService from './get-form-configuration.service';
import type { FormConfigRecord } from '../types/form-config';

function restFormConfigurationtoSeederService({ form_name }: { form_name: string }): Promise<FormConfigRecord> {
    return withApiResponseHandler<FormConfigRecord>(async () => {
        await deleteFormConfigurationService({ form_name });
        return getFormConfigurationService({ form_name });
    });
}

export default restFormConfigurationtoSeederService;
