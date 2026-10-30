import { Link } from '@tanstack/react-router';
import { useRouter } from '@tanstack/react-router';
import { HiArrowLeft, HiHome } from 'react-icons/hi2';
import { UnauthorizedIcon } from '../Placeholders/UnauthorizedIcon';

interface UnAuthorisedAccessProps {
    title?: string;
    message?: string;
    goBack?: boolean;
    goHome?: boolean;
}

const UnAuthorisedAccess: React.FC<UnAuthorisedAccessProps> = ({ message, title, goBack, goHome }) => {
    const router = useRouter();

    return (
        <div className="flex flex-col items-center justify-start h-full w-full p-6">
            <div className="flex flex-col items-center gap-5 max-w-sm w-full rounded-2xl border border-red-100 bg-white px-8 py-10 shadow-sm text-center">
                {/* Icon */}
                <div className="flex items-center justify-center size-14 rounded-full bg-red-50 border border-red-100">
                    <UnauthorizedIcon iconcolor="#1760deff" iconbadgeBgColor="#EF4444" iconbadgeColor="#FFFFFF" />
                    {/* <MdOutlineLock size={26} className="text-red-500" /> */}
                </div>

                {/* Text */}
                <div className="flex flex-col gap-1.5">
                    <h1 className="text-base font-semibold text-red-600 tracking-tight">{title ?? 'Access Denied'}</h1>
                    <p className="text-xs text-gray-500 leading-relaxed">{message ?? "This page or feature you're trying to access is not authorised for your account."}</p>
                </div>

                {/* Actions */}
                {(goBack || goHome) && (
                    <div className="flex items-center gap-2 mt-1">
                        {goBack && (
                            <button
                                onClick={() => router.history.back()}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-4 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
                            >
                                <HiArrowLeft size={13} />
                                Go Back
                            </button>
                        )}
                        {goHome && (
                            <Link
                                to="/"
                                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors"
                            >
                                <HiHome size={13} />
                                Return Home
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UnAuthorisedAccess;
