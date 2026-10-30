import RichTextEditor from '@/shared/modules/rich-text-editor/RichTextEditor';
import TestAlerts from '@/modules/dev-temp-space/pages/TestSpace/TestAlearts';
import TestErrorBaundary from '@/modules/dev-temp-space/pages/TestErrorBaundary/TestErrorBaundary';
import VirtualTableDemo from '@/modules/dev-temp-space/pages/VirtualTableDemo/VirtualTableDemo';
import SampleForm from '@/modules/dev-temp-space/pages/SampleForm/SampleForm';
import ImageWithUnknownExt from '@/shared/components/ui/ImageWithUnknowExt/ImageWithUnknowExt';
import { resolvePublicAssetPath } from '@/shared/utils/resolve-public-asset-path';
import logger from '@/shared/utils/logger';
import RenderMarkdown from '@/shared/components/smart/RenderMarkdown/RenderMarkdown';
import { useEffect, useState } from 'react';
import { TextInput } from '@/shared/components/ui/InputFields';
import { useAuth } from '@/shared/modules/auth/hooks/useAuth';
import './MSAccountDetails/MSAccountDetails.css';
import CopyText from '@/shared/components/ui/CopyText/CopyText';
import UnAuthorisedAccess from '@/shared/components/ui/UnAuthorisedAccess/UnAuthorisedAccess';
import { moduleLandingCardsMeta } from '@/shared/components/ui/LandingCard/contants/module-landing-cards-meta';
import LandingCard from '@/shared/components/ui/LandingCard/LandingCard';
import { noop } from '@tanstack/react-table';
import DynamicFormExample from '@/shared/modules/dynamic-form/__tests__/DynamicFormExample';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ErrorPlaceholder, LoadingPlaceholder } from '@/shared/components/ui/Placeholders';
import DynamicFormRenderer from '@/modules/admin-portal/modules/form-builder/components/smart/DynamicFormRenderer/DynamicFormRenderer';
import { ErrorBoundary } from 'react-error-boundary';
import ErrorBoundaryFallback from '@/shared/components/ui/ErrorBoundaryFallback/ErrorBoundaryFallback';
import UpdateIncidentForm from '@/modules/incident-ai/components/smart/UpdateIncidentForm/UpdateIncidentForm_Hybrid';
import ChatBot from '@/shared/components/smart/ChatBot/ChatBot';
import type { QuickMessage } from '@/shared/components/smart/ChatBot/ChatBot';
import TransferList from '@/shared/components/ui/TransferList/TransferList';
import type { TransferListItem } from '@/shared/components/ui/TransferList/TransferList';
import globalAlertToastEventBus from '@/shared/components/smart/GlobalAlertToast/global-alert-toast-event-bus';
import globalAlertDialogEventBus from '@/shared/components/smart/GlobalAlertDialog/global-alert-dialog-event-bus';
import FormActionButton from '@/shared/components/ui/FormActionButton/FormActionButton';
import { appConfig, type AppConfig } from '@/config/app-config';
import ModalExamples from './ModalExamples/ModalExamples';
import EmptyBoxPlaceholderExample from './LoaderExamples/EmptyPlaceholderExample';
import ErrorSVGExample from './LoaderExamples/ErrorSVGExample';
import SpinnerLoaderExample from './LoaderExamples/SpinningLoaderExample';
import SnowTicketAttachmentActions from '@/shared/modules/servicenow/components/SnowTicketAttachmentActions/SnowTicketAttachmentActions';
import { useFormConfigByNameQuery } from '@/modules/admin-portal/modules/form-builder/hooks/useFormConfigByNameQuery';
import MarkdownChartsAndMermaidDemo from './MarkdownChartsAndMermaidDemo';
import KBArticleAIScore from '@/shared/modules/atk-backend/components/smart/GenerateKBArticleModal/KBArticleAIScore/KBArticleAIScore';

const TRANSFER_LIST_ITEMS: TransferListItem[] = [
    { key: 'short_description', label: 'Short Description', description: 'string • required' },
    { key: 'state', label: 'State', description: 'choice' },
    { key: 'priority', label: 'Priority', description: 'integer' },
    { key: 'assignment_group', label: 'Assignment Group', description: 'reference -> sys_user_group' },
    { key: 'assigned_to', label: 'Assigned To', description: 'reference -> sys_user' },
    { key: 'category', label: 'Category', description: 'string' },
    { key: 'subcategory', label: 'Subcategory', description: 'string' },
    { key: 'work_notes', label: 'Work Notes', description: 'journal' },
    { key: 'close_notes', label: 'Close Notes', description: 'string' },
    { key: 'due_date', label: 'Due Date', description: 'glide_date_time' },
    { key: 'cmdb_ci', label: 'Configuration Item', description: 'reference -> cmdb_ci' },
    { key: 'impact', label: 'Impact', description: 'integer' },
];

function FormCodeLoader() {
    const [code, setCode] = useState('');
    const [activeCode, setActiveCode] = useState<string>('Incident Form');

    const formConfigQuery = useFormConfigByNameQuery(activeCode);

    const handleLoad = () => code.trim() && setActiveCode(code.trim());

    return (
        <>
            <div className="flex items-end gap-2 mb-4 w-full max-w-md">
                <div className="flex-1 space-y-0.5">
                    <label className="text-[10px] font-medium text-gray-500">Form Code</label>
                    <TextInput
                        value={code}
                        onChange={setCode}
                        placeholder="e.g. post, update-ticket, feature-showcase"
                        onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleLoad()}
                    />
                </div>
                <button
                    type="button"
                    onClick={handleLoad}
                    disabled={!code.trim()}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Load Form
                </button>
            </div>
            {activeCode && (
                <ErrorBoundary
                    fallbackRender={({ error, resetErrorBoundary }) => (
                        <ErrorBoundaryFallback error={error as Error} description={JSON.stringify(error)} reset={resetErrorBoundary} />
                    )}
                >
                    {formConfigQuery.isLoading ? <LoadingPlaceholder /> : null}
                    {formConfigQuery.isError ? (
                        <ErrorPlaceholder error={formConfigQuery.error} isRefetching={formConfigQuery.isRefetching} onRetry={formConfigQuery.refetch} />
                    ) : null}
                    {formConfigQuery.data ? (
                        <div className="flex-1 min-h-0 shadow w-full p-4 justify-center items-center rounded-lg">
                            <span className="text-xs font-medium text-gray-600">{formConfigQuery.data.name}</span>
                            <DynamicFormRenderer
                                record={formConfigQuery.data}
                                meta={{
                                    postId: 10,
                                    ticketType: 'incident',
                                    ticketId: '7f7e9079fb597e10dd3ffa656eefdcd5',
                                    environment: 'prod',
                                    productId: 1,
                                }}
                            />
                        </div>
                    ) : null}
                </ErrorBoundary>
            )}
        </>
    );
}

function TransferListDemo() {
    const [selected, setSelected] = useState<TransferListItem[]>([TRANSFER_LIST_ITEMS[0], TRANSFER_LIST_ITEMS[1]]);
    return (
        <div className="max-w-3xl border border-slate-200 rounded-lg p-4 bg-white">
            <TransferList
                available={TRANSFER_LIST_ITEMS}
                selected={selected}
                onChange={setSelected}
                availableTitle="Available Fields"
                selectedTitle="Selected Fields"
                searchPlaceholder="Search fields..."
            />
            <p className="text-[10px] text-gray-400 mt-2">Selected: {selected.map((s) => s.key).join(', ') || '(none)'}</p>
        </div>
    );
}

const SAMPLE_QUICK_MESSAGES: QuickMessage[] = [
    { label: 'Check server status', message: 'What is the current server status?' },
    { label: 'Recent incidents', message: 'Show me recent incidents' },
    { label: 'Run diagnostics', message: 'Run a full system diagnostics check' },
];

const DevTestSpacePage: React.FC = () => {
    const { state: authState, getAccessToken, getRefreshToken, refreshToken, revokeAccessToken, revokeRefreshToken, getUserSnowDetails } = useAuth();

    const [accessTokenValue, setAccessTokenValue] = useState('');
    const [refreshTokenValue, setRefreshTokenValue] = useState('');

    useEffect(() => {
        getRefreshToken()
            .then((t) => setRefreshTokenValue(t))
            .catch((err) => setRefreshTokenValue('Error fetching refresh token: ' + JSON.stringify(err)));
    }, []);

    useEffect(() => {
        getAccessToken()
            .then((t) => setAccessTokenValue(t))
            .catch((err) => setAccessTokenValue('Error fetching access token: ' + JSON.stringify(err)));
    }, []);

    const [savedHtml, setSavedHtml] = useState('');

    const techAssitNotResponse = `
## Enable Teams Add-in in Microsoft Outlook

**Knowledge article number:** KB0013232  
**Knowledge base:** Knowledge Assist  

### Purpose
Use this procedure when the Teams Meeting option is missing in Microsoft Outlook or when users are unable to schedule Microsoft Teams meetings directly from Outlook.

---

### Common Symptoms
Users may report one or more of the following:
* Teams Meeting button is missing from Outlook.
* Unable to schedule a Teams meeting from the Outlook Calendar.
* Microsoft Teams integration options are not visible in Outlook.
* Meetings can only be scheduled from the Microsoft Teams application.

---

### Prerequisites
Before troubleshooting, verify the following:
* Microsoft Teams is installed on the device.
* The user is signed in to Microsoft Teams.
* Outlook and Teams are running under the same user account.
* Outlook has fully loaded before checking for the Teams Meeting option.

---

### Outlook Teams Add-in Troubleshooting

#### Step 1: Open Outlook
* Launch Microsoft Outlook.
* Allow Outlook to load completely.

> **Instruction:** Locate the "File" tab in the top menu bar.
> 
> ![The image provides step 1 of a guide for using Microsoft Outlook. Here's the relevant instruction: 1. Open Outlook - Open the Outlook application on your device. - Locate the "File" tab in the top menu bar, circled in red in the visual for reference.](https://cisicmpengineering1.service-now.com/sys_attachment.do?sys_id=1f4d89e43ba7471057a74f0864e45a4e)

---

#### Step 2: Navigate to Add-ins
* Select **File** from the Outlook menu.
* Click **Options**.
* Select **Add-ins** from the left pane.

**Navigation Path:**  
File -> Options -> Add-ins

> **Instruction:** Accessing Add-ins in Microsoft Outlook.
> 
> ![This image provides instructions on accessing Add-ins in Microsoft Outlook. To do this: 1. Click on **File** in the top-left corner. 2. Select **Options** from the sidebar menu. 3. In the Options window, click on **Add-ins** to manage add-ins.](https://cisicmpengineering1.service-now.com/sys_attachment.do?sys_id=1f4d89e43ba7471057a74f0864e45a4e)

---

#### Step 3: Open COM Add-ins
In the Add-ins window, locate the **Manage** dropdown at the bottom.
* Select **COM Add-ins**.
* Click **Go**.

**Navigation Path:**  
Manage -> COM Add-ins -> Go

> **Instruction:** Select the "COM Add-ins" option in the "Manage" section.
> 
> ![This is an instructional image showing how to select the "COM Add-ins" option in the "Manage" section of a menu. It's Step 3 of a process, where the user is instructed to locate and click on "COM Add-ins" from a dropdown menu, likely within a Microsoft Office application.](sys_attachment.do?sys_id=1f4d89e43ba7471057a74f0864e45a4e)

---

#### Step 4: Enable Microsoft Teams Meeting Add-in
* In the COM Add-ins window, locate: **Microsoft Teams Meeting Add-in for Microsoft Office**
* Verify that the checkbox next to the add-in is selected.
* If the checkbox is not selected:
  * Select the checkbox.
  * Click **OK** to save the changes.
* Close and reopen Microsoft Teams and Outlook.
* Open the Outlook Calendar and select **New Meeting** or **New Appointment**.
* Verify that the Teams Meeting button is available on the Outlook ribbon.

> **Instruction:** Enable the add-in via COM Add-ins settings.
> 
> ![This is a screenshot of a step-by-step guide showing how to enable the **Microsoft Teams Meeting Add-in for Microsoft Office** in the COM Add-ins settings. ### Step Guide: 1. Navigate to the "COM Add-ins" settings in Microsoft Office. 2. Locate the **Microsoft Teams Meeting Add-in for Microsoft Office** in the list. 3. Check the box next to this option. 4. Click **OK** to enable the add-in. This will allow you to integrate Microsoft Teams features, such as scheduling Teams meetings, directly within Microsoft Office applications like Outlook.](/sys_attachment.do?sys_id=1f4d89e43ba7471057a74f0864e45a4e)

 ![Markdown Image](https://images.unsplash.com/photo-1789742203875-23af095ad5e2?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D "Official Markdown Logo")
---

### Resolution
The issue is resolved when the **Microsoft Teams Meeting Add-in for Microsoft Office** is enabled and the Teams Meeting button appears in Outlook, allowing users to schedule Microsoft Teams meetings directly from Outlook Calendar.

                `;
    const revokeRefreshTokenMutation = useMutation({
        mutationFn: revokeRefreshToken,
        onSuccess: () => {
            globalAlertToastEventBus.emit('show-alert-toast', {
                title: 'Refresh token revoked successfully',
                description: 'The refresh token has been revoked successfully.',
                severity: 'success',
                position: 'top-center',
            });
        },
        onError: (error) => {
            globalAlertDialogEventBus.emit('show-dialog', {
                title: 'Error revoking refresh token',
                note: `An error occurred while revoking the refresh token: ${JSON.stringify(error)}`,
                severity: 'error',
            });
        },
    });

    const revokeAccessTokenTokenMutation = useMutation({
        mutationFn: revokeAccessToken,
        onSuccess: () => {
            globalAlertToastEventBus.emit('show-alert-toast', {
                title: 'Access token revoked successfully',
                description: 'The access token has been revoked successfully.',
                severity: 'success',
                position: 'top-center',
            });
        },
        onError: (error) => {
            globalAlertDialogEventBus.emit('show-dialog', {
                title: 'Error revoking access token',
                note: `An error occurred while revoking the access token: ${JSON.stringify(error)}`,
                severity: 'error',
            });
        },
    });

    const refreshAccessTokenTokenMutation = useMutation({
        mutationFn: refreshToken,
        onSuccess: (token) => {
            setAccessTokenValue(token);
            globalAlertToastEventBus.emit('show-alert-toast', {
                title: 'Access token refreshed successfully',
                description: 'The access token has been refreshed successfully.',
                severity: 'success',
                position: 'top-center',
            });
        },
        onError: (error) => {
            globalAlertDialogEventBus.emit('show-dialog', {
                title: 'Error refreshing access token',
                note: `An error occurred while refreshing the access token: ${JSON.stringify(error)}`,
                severity: 'error',
            });
        },
    });

    const userSnowDetails = useQuery({
        queryFn: getUserSnowDetails,
        queryKey: ['getUserSnowDetails'],
    });

    logger.debug('appConfig : ', Object.getOwnPropertyNames(appConfig));

    const formConfigQuery = useFormConfigByNameQuery('Incident Form');

    return (
        <div className="h-full overflow-scroll">
            <div className="p-4 pt-0">
                <div className="debug-section">
                    <h3>Form Config (Debug)</h3>
                    <>
                        {formConfigQuery?.isLoading ? <LoadingPlaceholder /> : null}
                        {formConfigQuery?.isError ? (
                            <ErrorPlaceholder error={formConfigQuery?.error} isRefetching={formConfigQuery?.isRefetching} onRetry={formConfigQuery?.refetch} />
                        ) : null}
                        <pre className="debug-code">{JSON.stringify(formConfigQuery?.data, null, 2)}</pre>
                    </>
                </div>
                <div className="debug-section">
                    <h3>App Config Data (Debug)</h3>
                    {Object.getOwnPropertyNames(appConfig).map((key) => {
                        const data = appConfig?.[key as keyof AppConfig];
                        return (
                            <>
                                <h3 className="uppercase">{key} :</h3>
                                <pre className="debug-code">{JSON.stringify(data, null, 2)}</pre>
                            </>
                        );
                    })}
                </div>
                <div className="debug-section">
                    <h3>User Snow Details </h3>
                    <pre className="debug-code">
                        {userSnowDetails?.isLoading ? 'Loading ...' : null}
                        {userSnowDetails?.isError ? 'Error...' : null}
                        {userSnowDetails?.data ? JSON.stringify(userSnowDetails?.data) : null}
                    </pre>
                </div>

                <div className="debug-section">
                    <h3>Raw Auth State Data (Debug)</h3>
                    <pre className="debug-code">{JSON.stringify(authState, null, 2)}</pre>
                </div>

                <div className="debug-section">
                    <h3>Auth User Details (Debug)</h3>
                    <pre className="debug-code">{JSON.stringify(authState?.user, null, 2)}</pre>
                </div>
                <div className="debug-section">
                    <h3 className="flex gap-5 items-center">
                        <span>Auth User Access Token</span>
                        <span>
                            <FormActionButton
                                isSubmitting={refreshAccessTokenTokenMutation.isPending}
                                label="Refresh Access Token"
                                submittingLabel="Firing..."
                                onClick={() => refreshAccessTokenTokenMutation.mutate([])}
                                variant="primary"
                                className="max-w-max min-w-0"
                            />
                        </span>
                        <span>
                            <FormActionButton
                                isSubmitting={revokeAccessTokenTokenMutation.isPending}
                                label="Revoke Access Token"
                                submittingLabel="Firing..."
                                onClick={() => revokeAccessTokenTokenMutation.mutate()}
                                variant="danger"
                                className="max-w-max min-w-0"
                            />
                        </span>
                    </h3>
                    <pre className="debug-code">
                        <CopyText text={accessTokenValue} />
                    </pre>
                </div>
                <div className="debug-section">
                    <h3 className="flex gap-5 items-center">
                        <span>Auth User Refresh Token</span>
                        <span>
                            <FormActionButton
                                isSubmitting={revokeRefreshTokenMutation.isPending}
                                label="Revoke Refresh Token"
                                submittingLabel="Firing..."
                                onClick={() => revokeRefreshTokenMutation.mutate()}
                                variant="danger"
                                className="max-w-max min-w-0"
                            />
                        </span>
                    </h3>
                    <pre className="debug-code">
                        <CopyText text={refreshTokenValue} />
                    </pre>
                </div>
            </div>
            <div className="mt-4 p-4 flex gap-4 flex-wrap">
                <div className="min-w-full lg:min-w-[50%]">
                    <h1 className="text-sm font-semibold mb-2">Sample Form</h1>
                    <div className="max-w-200 min-h-0 border border-slate-200 rounded-lg overflow-hidden">
                        <SampleForm />
                    </div>
                </div>

                <div className="mt-4 p-4">
                    <h1 className="text-sm font-semibold mb-2">ImageWithUnknownExt (public asset resolution test)</h1>
                    <div className="flex items-center gap-4">
                        <ImageWithUnknownExt
                            baseSrcWithoutFileExtension={resolvePublicAssetPath('/brand-logo')}
                            fallbackSrc={resolvePublicAssetPath('/assets/shared/missing-image.svg')}
                            alt="brand-log"
                            style={{
                                height: '150px',
                                maxWidth: '250px',
                            }}
                        />

                        <span className="text-xs text-slate-500">Should load brand-logo from remote in MFE mode</span>
                    </div>
                </div>
            </div>
            <div>
                <DynamicFormExample />
            </div>
            <div>
                <UnAuthorisedAccess goBack goHome message="Your are not authorised to access any of the available prompt libraries !" />
            </div>
            <div className="mt-6 px-4 pb-8">
                <div className="mb-3 flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <div>
                        <h1 className="text-base font-bold text-slate-900 tracking-tight">ServiceNow Attachment Component Demo</h1>
                        <p className="text-xs text-slate-500 font-medium">Click Attachments button to open popover for direct upload or 7xl modal file download table.</p>
                    </div>
                    <SnowTicketAttachmentActions title="Incident Attachments" tableName="incident" tableSysId="70affd003be66a1457a74f0864e45aa0" />
                </div>
            </div>
            <div className="flex flex-row flex-wrap gap-4 p-4">
                {moduleLandingCardsMeta.map((meta, i) => {
                    return (
                        <LandingCard
                            id={`${meta.id}-${i}`}
                            key={`${meta.title}-${i}`}
                            agents={meta.agents}
                            features={meta.features}
                            circleBg={meta.circleBg}
                            description={meta.description}
                            iconBasePath={meta.iconBasePath}
                            title={meta.title}
                            variant={meta.variant}
                            onClick={noop}
                        />
                    );
                })}
            </div>
            <div className="mt-4 px-4">
                <VirtualTableDemo />
            </div>
            <div className="mt-6 px-4">
                <MarkdownChartsAndMermaidDemo />
            </div>
            <div className="mt-4 p-4 w-200">
                <h1>Tech Assit bot Message Markdown Test</h1>
                <RenderMarkdown text={techAssitNotResponse} />
            </div>
            <div className="p-4">
                <h3>
                    KB AI Scoring:{' '}
                    <KBArticleAIScore
                        score={2}
                        getScoreBy="content"
                        KBContent='<style>.editor-text-bold{font-weight:bold}.editor-text-code{color:rgb(240,242,245);caret-color:rgb(240,242,245);background-color:rgb(30,30,30);padding:1px 0.25rem;font-family:Menlo,Consolas,Monaco,monospace;font-size:90%}.editor-link{color:rgb(33,111,219);text-decoration:none}.editor-paragraph{margin:0;margin-bottom:6px;position:relative}.editor-paragraph:last-child{margin-bottom:0}.editor-heading-h1{font-size:18px;font-weight:700;margin:0;margin-bottom:8px;padding:0}.editor-heading-h2{font-size:14px;font-weight:700;margin:0;margin-top:8px;padding:0;text-transform:uppercase}.editor-heading-h3{font-size:13px;font-weight:700;margin:0;margin-top:8px;padding:0}.editor-list-ul{margin:0;padding-left:20px;list-style-type:disc;list-style-position:outside}.editor-listitem{margin:3px 0}</style>
<h1 class="editor-heading-h1"><span style="white-space: pre-wrap;">How to Map a Network Drive on Windows</span></h1>
<p class="editor-paragraph"><span style="white-space: pre-wrap;">Mapping a network drive allows you to access shared folders over a network directly through File Explorer. This guide provides step-by-step instructions to map and reconnect a network drive on Windows.</span></p>
<h2 class="editor-heading-h2"><span style="white-space: pre-wrap;">Step-by-Step Instructions</span></h2>
<h3 class="editor-heading-h3"><span style="white-space: pre-wrap;">Step 1: Open File Explorer</span></h3>
<ul class="editor-list-ul">
<li class="editor-listitem"><span style="white-space: pre-wrap;">Press the </span><strong><strong class="editor-text-bold" style="white-space: pre-wrap;">Windows key + E</strong></strong><span style="white-space: pre-wrap;"> on your keyboard to launch File Explorer.</span></li>
<li class="editor-listitem"><span style="white-space: pre-wrap;">File Explorer provides a navigation pane to access your system folders.</span></li>
</ul>
<h3 class="editor-heading-h3"><span style="white-space: pre-wrap;">Step 2: Access "This PC"</span></h3>
<ul class="editor-list-ul">
<li class="editor-listitem"><span style="white-space: pre-wrap;">Locate and select </span><strong><strong class="editor-text-bold" style="white-space: pre-wrap;">"This PC"</strong></strong><span style="white-space: pre-wrap;"> from the left-hand navigation pane.</span></li>
<li class="editor-listitem"><span style="white-space: pre-wrap;">"This PC" organizes drives and network locations for easy access.</span></li>
</ul>
<h3 class="editor-heading-h3"><span style="white-space: pre-wrap;">Step 3: Map Network Drive</span></h3>
<ul class="editor-list-ul">
<li class="editor-listitem"><span style="white-space: pre-wrap;">Right-click on </span><strong><strong class="editor-text-bold" style="white-space: pre-wrap;">"This PC"</strong></strong><span style="white-space: pre-wrap;"> and choose the </span><strong><strong class="editor-text-bold" style="white-space: pre-wrap;">"Map network drive"</strong></strong><span style="white-space: pre-wrap;"> option.</span></li>
<li class="editor-listitem"><span style="white-space: pre-wrap;">A dialog box will appear for setting up the network drive.</span></li>
</ul>
<h3 class="editor-heading-h3"><span style="white-space: pre-wrap;">Step 4: Enter Details</span></h3>
<ul class="editor-list-ul">
<li class="editor-listitem"><span style="white-space: pre-wrap;">Select a drive letter from the drop-down menu. This will represent the network drive in File Explorer.</span></li>
<li class="editor-listitem"><span style="white-space: pre-wrap;">Type the network path of the shared folder in the </span><strong><strong class="editor-text-bold" style="white-space: pre-wrap;">"Folder"</strong></strong><span style="white-space: pre-wrap;"> field (e.g., </span><code style="white-space: pre-wrap;"><span class="editor-text-code">\\server\sharedfolder</span></code><span style="white-space: pre-wrap;">).</span></li>
</ul>
<h3 class="editor-heading-h3"><span style="white-space: pre-wrap;">Step 5: Finish</span></h3>
<ul class="editor-list-ul">
<li class="editor-listitem"><span style="white-space: pre-wrap;">Check the </span><strong><strong class="editor-text-bold" style="white-space: pre-wrap;">"Reconnect at sign-in"</strong></strong><span style="white-space: pre-wrap;"> box if you want the network drive to reconnect automatically after a reboot.</span></li>
<li class="editor-listitem"><span style="white-space: pre-wrap;">Click the </span><strong><strong class="editor-text-bold" style="white-space: pre-wrap;">"Finish"</strong></strong><span style="white-space: pre-wrap;"> button to complete the mapping process.</span></li>
</ul>
<h2 class="editor-heading-h2"><span style="white-space: pre-wrap;">Validation Steps</span></h2>
<ul class="editor-list-ul">
<li class="editor-listitem"><span style="white-space: pre-wrap;">Open File Explorer and navigate to </span><strong><strong class="editor-text-bold" style="white-space: pre-wrap;">"This PC"</strong></strong><span style="white-space: pre-wrap;">. Ensure the mapped drive appears with the selected drive letter.</span></li>
<li class="editor-listitem"><span style="white-space: pre-wrap;">Access the mapped network drive and confirm that you can view and interact with the contents of the shared folder.</span></li>
</ul>
<h2 class="editor-heading-h2"><span style="white-space: pre-wrap;">Troubleshooting</span></h2>
<h3 class="editor-heading-h3"><span style="white-space: pre-wrap;">Issue: Mapped drive disappears after system reboot</span></h3>
<ul class="editor-list-ul">
<li class="editor-listitem"><span style="white-space: pre-wrap;">Solution: Ensure the </span><strong><strong class="editor-text-bold" style="white-space: pre-wrap;">"Reconnect at sign-in"</strong></strong><span style="white-space: pre-wrap;"> option is checked during the mapping process.</span></li>
</ul>
<h3 class="editor-heading-h3"><span style="white-space: pre-wrap;">Issue: Network path is inaccessible</span></h3>
<ul class="editor-list-ul">
<li class="editor-listitem"><span style="white-space: pre-wrap;">Solution: Verify that the shared folder is accessible over the network and there are no connectivity issues.</span></li>
<li class="editor-listitem"><span style="white-space: pre-wrap;">Solution: Confirm the correct path format (e.g., </span><code style="white-space: pre-wrap;"><span class="editor-text-code">\\server\folder</span></code><span style="white-space: pre-wrap;">).</span></li>
</ul>
<h3 class="editor-heading-h3"><span style="white-space: pre-wrap;">Issue: Insufficient permissions</span></h3>
<ul class="editor-list-ul">
<li class="editor-listitem"><span style="white-space: pre-wrap;">Solution: Request access from the folder administrator or confirm your user account permissions on the network.</span></li>
</ul>
<h2 class="editor-heading-h2"><span style="white-space: pre-wrap;">Related Links</span></h2>
<ul class="editor-list-ul">
<li class="editor-listitem"><a class="editor-link" href="https://support.microsoft.com/en-us/windows/map-a-network-drive-2c5e2f15-1cc7-49a0-9d8c-3e7c8566c30f" target="_blank" rel="noopener noreferrer nofollow"><span style="white-space: pre-wrap;">Microsoft Support: Map a Network Drive</span></a></li>
<li class="editor-listitem"><a class="editor-link" href="https://learn.microsoft.com/en-us/windows-server/storage/file-server/file-server-overview" target="_blank" rel="noopener noreferrer nofollow"><span style="white-space: pre-wrap;">Windows Server File Sharing Documentation</span></a></li>
</ul>'
                        KBNumber=""
                    />
                </h3>
            </div>
            <div className="p-4">
                <h3>Split Button Style</h3>
                <button className="btn-split split-blue text-base py-1 px-8 rounded">
                    <span>Button</span>
                </button>
            </div>
            <div className="p-4">
                <h3>Test Modal</h3>
                <ModalExamples />
            </div>
            <div className="mt-4 p-4">
                <TestAlerts />
                <TestErrorBaundary />
                <RichTextEditor
                    isSnowRelated={false}
                    initialHtml={`<!DOCTYPE html>
                    <html lang=\"en\">

                    <head>
                        <meta charset=\"UTF-8\">
                        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
                        <title>Resolving Anomaly Observed on WindowsCPUUsed Metric</title>
                        <link href=\"https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css\" rel=\"stylesheet\">
                        <style>
                            body {
                                background-color: white;
                            }

                            h1,
                            h2,
                            h3 {
                                color: blue;
                            }

                            p,
                            li {
                                font-size: 1rem;
                            }
                        </style>
                    </head>

                    <body>
                        <div class="container my-4">
                            <h1 style="white-space: no-wrap;">Resolving Anomaly Observed on WindowsCPUUsed Metric</h1>
                            <section>
                                <h2>Summary</h2>
                                <p>An anomaly was detected in the WindowsCPUUsed metric with a confidence score of 59.0. The observed metric value was 6.503, which is outside the expected range of 0.701 to 4.344. This document provides steps to address and resolve this anomaly.</p>
                            </section>
                            <section>
                                <h2>Step-by-Step Instructions</h2>
                                <h3>1. Verify the Anomalous Metric</h3>
                                <ul>
                                    <li>Access the monitoring dashboard where the WindowsCPUUsed metric is logged.</li>
                                    <li>Check the historical data to confirm that the anomaly is not an isolated incident.</li>
                                </ul>
                                <p>Validating the data ensures the anomaly is genuine and not a result of a temporary spike or logging error.</p>
                                <h3>2. Investigate Potential Causes</h3>
                                <ul>
                                    <li>Review recent changes in the system such as updates, patches, or new deployments that could have affected CPU usage.</li>
                                    <li>Check for scheduled tasks or processes running during the time of anomaly.</li>
                                </ul>
                                <p>Understanding the root cause helps in formulating an appropriate response to mitigate the issue.</p>
                                <h3>3. Implement Corrective Measures</h3>
                                <ul>
                                    <li>If a process is consuming excessive CPU, consider optimizing the code or scaling resources appropriately.</li>
                                    <li>Set up alerts to monitor CPU usage more closely in the future.</li>
                                </ul>
                                <p>Taking corrective actions will help in maintaining optimal system performance and prevent future anomalies.</p>
                            </section>
                            <section>
                                <h2>Validation Steps</h2>
                                <p>Post-resolution, confirm that CPU usage is within the expected range by continuously monitoring the metric. Ensure no further anomalies are detected over a defined period.</p>
                            </section>
                            <section>
                                <h2>Troubleshooting</h2>
                                <p>If anomalies persist, consider involving system architects for a deeper analysis of the infrastructure and workloads.</p>
                            </section>
                            <section>
                                <h2>Related Links or Articles</h2>
                                <ul>
                                    <li><a href="#" class="text-primary">Understanding CPU Usage Metrics</a></li>
                                    <li><a href="#" class="text-primary">Best Practices for Resource Monitoring</a></li>
                                </ul>
                            </section>

                            <p>
                                <img 
                                    title="artificial-intelligence.png"
                                    src="sys_attachment.do?sys_id=e5242f433b3ec71057a74f0864e45a86"
                                    alt="btn-split (1) (1) (1).gif" 
                                    width="326" 
                                    height="144" 
                                    data-library="false"
                                >
                            </p>

                        </div>
                        <script src="https://code.jquery.com/jquery-3.5.1.slim.min.js"></script>
                        <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.9.3/dist/umd/popper.min.js"></script>
                        <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
                    </body>

                    </html>`}
                    onSave={(html) => {
                        setSavedHtml(html);
                        logger.debug(html);
                    }}
                    preserveInitialHtml={{
                        classes: true,
                        head: true,
                        styles: true,
                    }}
                />
                {savedHtml ? (
                    <div className="mt-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
                        <h3 className="text-sm font-semibold mb-2">Saved HTML in parent state</h3>
                        <textarea className="w-full min-h-120 p-3 text-xs font-mono bg-white border border-slate-200 rounded" readOnly value={savedHtml} />
                    </div>
                ) : null}
            </div>
            <div className="mt-4 flex justify-start items-start flex-col px-4">
                <h1 className="text-sm font-semibold mb-2">Dynamic Forms Testing - Load by Code</h1>
                <FormCodeLoader />
            </div>
            <div className="mt-4 px-4">
                <h1 className="text-sm font-semibold mb-2">TransferList Component Demo</h1>
                <TransferListDemo />
            </div>
            <div className="mt-4 flex justify-start items-start flex-col max-w-140 px-4 min-h-40">
                <h1>Dynamic Forms Testing : Update SNOW Ticket Replica for the Original</h1>
                <UpdateIncidentForm incidentData={{}} incidentId="7f7e9079fb597e10dd3ffa656eefdcd5" />
            </div>
            <div className="mt-4 px-4">
                <h1 className="text-sm font-semibold mb-2">ChatBot Demo</h1>
                <div className="max-w-200 h-120 border border-slate-200 rounded-lg overflow-hidden">
                    <ChatBot
                        systemMessage="Hello! I'm a demo assistant. How can I help you today?"
                        quickMessages={SAMPLE_QUICK_MESSAGES}
                        sendMessage={async ({ userMessage }) => {
                            await new Promise((r) => setTimeout(r, 3500));
                            return { response: `Echo: ${userMessage}`, conversation_history: [] };
                        }}
                    />
                </div>
            </div>
            <div className="p-1">
                {' '}
                <SpinnerLoaderExample />
            </div>
            <div className="p-1">
                <EmptyBoxPlaceholderExample />
            </div>
            <div className="p-1">
                {' '}
                <ErrorSVGExample />
            </div>
        </div>
    );
};

export default DevTestSpacePage;
