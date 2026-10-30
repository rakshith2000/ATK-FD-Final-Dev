import { useCallback } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import ToolkitPackageConfiguration from './ToolkitPackageConfiguration';

const ToolkitPackageConfigurationRoute: React.FC = () => {
    const navigate = useNavigate();
    const searchParams = useSearch({ strict: false });
    const libParam = (searchParams as { lib?: string })?.lib;

    const handlePackageChange = useCallback(
        (pkg: string | null) => {
            navigate({ to: '.', search: { lib: pkg ?? undefined } });
        },
        [navigate],
    );

    return <ToolkitPackageConfiguration initialPackage={libParam ?? null} onPackageChange={handlePackageChange} />;
};

export default ToolkitPackageConfigurationRoute;
