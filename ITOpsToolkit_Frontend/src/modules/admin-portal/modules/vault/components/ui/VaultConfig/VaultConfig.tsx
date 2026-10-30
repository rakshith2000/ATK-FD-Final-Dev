import UploadVaultConfigForm from '../../smart/UploadVaultConfigForm/UploadVaultConfigForm';
import { MdSecurity } from 'react-icons/md';

const VaultConfig = () => {
    return (
        <div className="flex h-full min-h-0 flex-col gap-4 shadow border border-(--brand-border-color) rounded-md overflow-auto bg-white">
            {/* Header */}
            <div className="flex items-center gap-2.5 p-2 bg-(--brand-color) border-b-2 border-(--brand-border-color)">
                <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-(--brand-text-inverse) text-(--brand-color)">
                    <MdSecurity size={16} className="text-(--brand-color)" />
                </div>
                <h1 className="text-xs font-semibold text-(--brand-text-inverse)">Vault Configuration</h1>
            </div>

            {/* Form Card */}
            <div className="mx-auto w-full max-w-2xl rounded-xl border border-(--brand-border-color) bg-white shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 border-b border-(--brand-border-color) bg-(--brand-color)/3 px-4 py-2.5">
                    <span className="size-1.5 rounded-full bg-(--brand-color)" />
                    <span className="text-xs font-semibold text-(--brand-title-primary-color)">Upload Vault Configuration</span>
                </div>
                <UploadVaultConfigForm />
            </div>
        </div>
    );
};

export default VaultConfig;
