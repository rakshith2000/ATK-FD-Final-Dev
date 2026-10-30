const llmConfigFieldsByType = {
    'AWS Nova': [
        {
            key: 'AWS_ACCESS_KEY_ID',
            label: 'AWS Access Key ID',
            placeholder: 'Enter AWS access key',
        },
        {
            key: 'AWS_SECRET_ACCESS_KEY',
            label: 'AWS Secret Access Key',
            placeholder: 'Enter AWS secret access key',
        },
        {
            key: 'AWS_REGION_NAME',
            label: 'AWS Region Name',
            placeholder: 'e.g. us-east-1',
        },
    ],

    'Azure OpenAI': [
        {
            key: 'AZURE_API_KEY',
            label: 'Azure API Key',
            placeholder: 'Enter Azure OpenAI API key',
        },
        {
            key: 'AZURE_API_BASE',
            label: 'Azure API Base URL',
            placeholder: 'https://your-resource-name.openai.azure.com/',
        },
        {
            key: 'AZURE_API_VERSION',
            label: 'Azure API Version',
            placeholder: 'e.g. 2024-02-15-preview',
        },
        {
            key: 'AZURE_DEPLOYMENT_NAME',
            label: 'Azure Deployment  Name',
            placeholder: 'eg: deployment-name',
        },
    ],

    'Google Gemini': [
        {
            key: 'VERTEX_AI_PROJECT',
            label: 'Vertex AI Project',
            placeholder: 'Enter Vertex AI project',
        },
        {
            key: 'GEMINI_API_KEY',
            label: 'Gemini API Key',
            placeholder: 'Enter Gemini API key',
        },
    ],
} as const;

export default llmConfigFieldsByType;
