const llmGuardsOptions: Array<{ label: string; value: string }> = [
    { label: 'Anonymization', value: 'Anonymization' },
    { label: 'Toxicity ', value: 'Toxicity' },
    { label: 'Gibberish', value: 'Gibberish' },
    { label: 'Prompt Injection', value: 'PromptInjection' },
    { label: 'Malicious URLs', value: 'MaliciousURLs' },
    { label: 'Bancode', value: 'Bancode' },
    { label: 'Bias', value: 'Bias' },
];

export default llmGuardsOptions;
