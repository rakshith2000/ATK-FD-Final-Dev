import { getAuthProviderInstance } from '@/shared/modules/auth/utils/get-auth-provider-instance';
import getPromptLibrariesMeta from '../contants/prompt-libraries-meta';

const getAllowedPromptLibraryOptions = () => {
    const authProviderInstance = getAuthProviderInstance();

    return getPromptLibrariesMeta().filter((option) => authProviderInstance.hasGroupMembership(option.accessControlGroup));
};

export default getAllowedPromptLibraryOptions;
