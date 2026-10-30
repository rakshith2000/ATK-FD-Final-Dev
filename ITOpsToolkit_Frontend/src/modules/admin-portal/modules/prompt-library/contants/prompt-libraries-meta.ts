import { appConfig } from '@/config/app-config';

const getPromptLibrariesMeta = (): Array<{ landingCardId: string; label: string; value: string; accessControlGroup: string }> => [
    { landingCardId: '/itops/change-ai', label: 'Change AI', value: 'change_assist', accessControlGroup: appConfig.accessControl.features.gbac.changeAiPromptLibrary },
    { landingCardId: '/transition/train-ai', label: 'Train AI', value: 'train_assist', accessControlGroup: appConfig.accessControl.features.gbac.trainAiPromptLibrary },
    {
        landingCardId: '/transition/knowledge-ai',
        label: 'Knowledge AI',
        value: 'knowledge_assist',
        accessControlGroup: appConfig.accessControl.features.gbac.knowledgeAiPromptLibrary,
    },
    { landingCardId: '/transition/meeting-ai', label: 'Meeting AI', value: 'meeting_assist', accessControlGroup: appConfig.accessControl.features.gbac.meetingAiPromptLibrary },
    { landingCardId: '/itops/incident-ai', label: 'Incident AI', value: 'incident_assist', accessControlGroup: appConfig.accessControl.features.gbac.incidentAiPromptLibrary },
    { landingCardId: '/itops/problem-ai', label: 'Problem AI', value: 'problem_assist', accessControlGroup: appConfig.accessControl.features.gbac.problemAiPromptLibrary },
    {
        landingCardId: '/itops/major-incident-management',
        label: 'Major Incident Management',
        value: 'mim_assist',
        accessControlGroup: appConfig.accessControl.features.gbac.mimAiPromptLibrary,
    },
];

export default getPromptLibrariesMeta;
