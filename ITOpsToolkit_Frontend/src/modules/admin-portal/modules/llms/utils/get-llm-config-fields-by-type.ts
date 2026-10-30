import llmConfigFieldsByType from '../constants/llm-config-fields-by-type';

const getLLMConfigFieldsByType = (llmType: string): Record<string, string> => {
    const fields = llmConfigFieldsByType[llmType as keyof typeof llmConfigFieldsByType];

    if (!fields) {
        return {};
    }

    return fields.reduce<Record<string, string>>((acc, field) => {
        acc[field.key] = '';
        return acc;
    }, {});
};

export default getLLMConfigFieldsByType;
