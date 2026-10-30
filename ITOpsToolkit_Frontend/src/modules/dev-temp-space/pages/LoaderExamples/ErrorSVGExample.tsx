import { NotFoundIcon } from '@/shared/components/ui/Placeholders/NotFoundIcon';
import { ServerErrorIcon } from '@/shared/components/ui/Placeholders/ServerErrorIcon';
import { UnauthorizedIcon } from '@/shared/components/ui/Placeholders/UnauthorizedIcon';

export default function ErrorSVGExample() {
    return (
        <div className="flex flex-col gap-8 p-6 overflow-x-auto">
            {/* Row 1: Unauthorized Section */}
            <div className="flex items-center gap-23 shrink-0">
                <span className="font-semibold text-lg min-w-[160px]">UnAuthorized ICON</span>
                <UnauthorizedIcon size={50} />
                <UnauthorizedIcon size={100} iconcolor="#FEE2E2" iconbadgeColor="#987700ff" iconbadgeBgColor="#c6bebeff" />
                <UnauthorizedIcon size={210} iconcolor="#1760deff" iconbadgeBgColor="#EF4444" iconbadgeColor="#FFFFFF" />
            </div>

            {/* Row 2: Not Found Section */}
            <div className="flex items-center gap-20 shrink-0">
                <span className="font-semibold text-lg min-w-[160px]">NOT Found ICON</span>
                <NotFoundIcon size={50} />
                <NotFoundIcon size={150} iconcolor="#f581f7ff" iconbadgeBgColor="#EF4444" iconbadgeColor="#FFFFFF" />
                <NotFoundIcon size={200} iconcolor="#ffe0faff" iconbadgeBgColor="#afafafff" iconbadgeColor="#00ff9dff" />
            </div>

            {/* Row 3: Server Error Section */}
            <div className="flex items-center gap-20 shrink-0">
                <span className="font-semibold text-lg min-w-[160px]">Server Error ICON</span>
                <ServerErrorIcon size={50} />
                <ServerErrorIcon size={130} iconcolor="#8ad6ffff" iconbadgeBgColor="#fffb00ff" iconbadgeColor="#FFFFFF" />
                <ServerErrorIcon size={230} iconcolor="#ffa9adff" iconbadgeBgColor="#00b3ffff" iconbadgeColor="#b701ffff" />
            </div>
        </div>
    );
}
