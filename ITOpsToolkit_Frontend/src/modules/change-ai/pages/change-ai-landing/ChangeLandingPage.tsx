import React, { Suspense, useState } from 'react';
import { Ticket } from 'lucide-react';
import ShellLayout from '@/shared/components/ui/ShellLayout/ShellLayout';
import HeroSection from '@/shared/components/ui/HeroSection/HeroSection';
import CreateChangeRequestForm, { type GenerateChangeArgs } from '../../components/smart/CreateChangeRequestForm/CreateChangeRequestForm';
import { useDraftChangeMutation } from '../../hooks/useDraftChangeMutation';
import type { DraftChangeResponse } from '../../types/change-ai';
import { appConfig } from '@/config/app-config';
import { LoadingPlaceholder } from '@/shared/components/ui/Placeholders';

const CreateChangeDetailsForm = React.lazy(() =>
    appConfig.hybridForms.enableChangeForm
        ? import('../../components/smart/CreateChangeDetails/CreateChangeDetails_Hybrid')
        : import('../../components/smart/CreateChangeDetails/CreateChangeDetails'),
);

interface PushContext {
    cmdb_ci: string;
    attachments: string[];
}

const ChangeLandingPage: React.FC = () => {
    const draftMutation = useDraftChangeMutation();
    const [draft, setDraft] = useState<DraftChangeResponse | null>(null);
    const [pushContext, setPushContext] = useState<PushContext>({ cmdb_ci: '', attachments: [] });

    const handleGenerate = async ({ request, cmdb_ci, attachments }: GenerateChangeArgs) => {
        const data = await draftMutation.mutateAsync(request);
        setPushContext({ cmdb_ci, attachments });
        setDraft(data);
    };

    const handleCancel = () => {
        setDraft(null);
        draftMutation.reset();
    };

    return (
        <div id="change-ai" className="flex flex-col lg:flex-row w-full h-full gap-0.5 overflow-auto">
            {/* Section 1 -> Create Change Request form */}
            <div className="w-full h-full min-h-100 lg:w-[40%]">
                <CreateChangeRequestForm onGenerate={handleGenerate} isGenerating={draftMutation.isPending} />
            </div>

            {/* Section 2 -> Generated change details or placeholder */}
            <div className="w-full h-full min-h-100 lg:w-[60%]">
                {draft ? (
                    <Suspense fallback={<LoadingPlaceholder />}>
                        <CreateChangeDetailsForm
                            key={pushContext.cmdb_ci}
                            draft={draft}
                            cmdb_ci={pushContext.cmdb_ci}
                            attachments={pushContext.attachments}
                            onCancel={handleCancel}
                        />
                    </Suspense>
                ) : (
                    <ShellLayout className="h-full min-h-0 w-full rounded">
                        <ShellLayout.Body>
                            <HeroSection
                                title="CHANGE AI"
                                subTitle="Welcome to Change AI"
                                description="Choose a ticket to get AI powered assistance"
                                iconNode={
                                    <div className="flex items-center justify-center size-14 rounded-full bg-(--brand-color)/10">
                                        <Ticket size={26} className="text-(--brand-color)" />
                                    </div>
                                }
                            />
                        </ShellLayout.Body>
                    </ShellLayout>
                )}
            </div>
        </div>
    );
};

export default ChangeLandingPage;
