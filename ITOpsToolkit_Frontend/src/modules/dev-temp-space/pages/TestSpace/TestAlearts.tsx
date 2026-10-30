import globalAlertDialogEventBus from '@/shared/components/smart/GlobalAlertDialog/global-alert-dialog-event-bus';
import globalAlertToastEventBus from '@/shared/components/smart/GlobalAlertToast/global-alert-toast-event-bus';
import globalSuccessAlertEventBus from '@/shared/components/smart/GlobalSuccessAlert/global-success-alert-event-bus';
const TestAlerts = () => {
    const onClickTestDialogs = () => {
        globalAlertDialogEventBus.emit('show-dialog', {
            note: 'Test .................................',
            severity: 'info',
            title: 'Test 1',
            priority: 'normal',
            autoCloseDuration: 2000,
        });
        globalAlertDialogEventBus.emit('show-dialog', {
            note: 'Test .................................',
            severity: 'error',
            title: 'Test 2',
            priority: 'normal',
        });
        globalAlertDialogEventBus.emit('show-dialog', {
            note: 'Test .................................',
            severity: 'warning',
            title: 'Test 3',
            priority: 'normal',
        });
        globalAlertDialogEventBus.emit('show-dialog', {
            note: 'Test .................................',
            severity: 'success',
            title: 'Test 4',
            priority: 'normal',
        });

        globalAlertDialogEventBus.emit('show-dialog', {
            note: 'Test .................................',
            severity: 'error',
            title: 'High 2',
            priority: 'high',
        });
    };

    const onClickTestToasts = () => {
        // Bottom row
        globalAlertToastEventBus.emit('show-alert-toast', {
            title: 'Bottom Left',
            description: 'Success alert',
            severity: 'success',
            position: 'bottom-left',
        });

        globalAlertToastEventBus.emit('show-alert-toast', {
            title: 'Bottom Center',
            description: 'Info alert',
            severity: 'info',
            position: 'bottom-center',
        });

        globalAlertToastEventBus.emit('show-alert-toast', {
            title: 'Bottom Right',
            description: 'Error alert',
            severity: 'error',
            position: 'bottom-right',
        });

        // Top row
        globalAlertToastEventBus.emit('show-alert-toast', {
            title: 'Top Left',
            description: 'Warning alert',
            severity: 'warning',
            position: 'top-left',
        });

        globalAlertToastEventBus.emit('show-alert-toast', {
            title: 'Top Center',
            description: 'Session expiring',
            severity: 'warning',
            position: 'top-center',
        });

        globalAlertToastEventBus.emit('show-alert-toast', {
            title: 'Top Right',
            description: 'Saved successfully',
            severity: 'success',
            position: 'top-right',
        });
    };

    const onClickTestSuccessToasts = () => {
        globalSuccessAlertEventBus.emit('show-alert', {
            title: 'Success!',
            note: 'Ticket Rejected',
            severity: 'brand',
            buttonText: 'Close',
            buttonClassName: 'w-50!',
        });
    };
    return (
        <>
            <button onClick={onClickTestDialogs} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md shadow hover:bg-blue-700 transition">
                Test Global Alert Dialogs
            </button>

            <button onClick={onClickTestToasts} className="ml-3 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md shadow hover:bg-green-700 transition">
                Test Global Alert Toasts
            </button>
            <button onClick={onClickTestSuccessToasts} className="ml-3 px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-md shadow hover:bg-green-700 transition">
                Test Global Success Toasts
            </button>
        </>
    );
};

export default TestAlerts;
