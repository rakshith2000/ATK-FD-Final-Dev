import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LoaderCircle, LogOut, Monitor, Settings, FileText, Terminal, FolderTree, Milestone, ShieldCheck } from 'lucide-react';
import ImageWithUnknowExt from '../ImageWithUnknowExt/ImageWithUnknowExt';
import { resolvePublicAssetPath } from '@/shared/utils/resolve-public-asset-path';
import { useAuth } from '@/shared/modules/auth/hooks/useAuth';
import { useLicense } from '@/license/hooks/useLicense';
import { Link, useNavigate } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import globalAlertToastEventBus from '@/shared/components/smart/GlobalAlertToast/global-alert-toast-event-bus';
import { clearAllQueries } from '@/shared/utils/clear-all-queries';
import { useViewMode, viewModeOptions } from '@/shared/context/ViewModeContext';
import { appConfig } from '@/config/app-config';
import { AppBreadcrumbs } from '../AppBreadcrumbs/AppBreadcrumbs';
import { appEnvConfig } from '@/config/app-env-config';
import { getPortalContainer } from '@/shared/utils/get-portal-container';
import packageJson from '../../../../../package.json';
import CopyText from '../CopyText/CopyText';

const AppHeader: React.FC = () => {
    const avatarRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [dropdownPos, setDropdownPos] = useState({ top: 30, right: 0 });

    const { getUser, logout, hasGroupMembership } = useAuth();
    const { expTimeStampStr: licenseExp, customerName: licenseCustomerName } = useLicense();
    const { viewMode, setViewMode } = useViewMode();
    const navigate = useNavigate();
    const user = getUser();

    const userDisplayName = user?.displayName;
    const userAvatarBadge = user?.displayName?.charAt(0).toUpperCase();

    // Position dropdown below the avatar
    useEffect(() => {
        if (!open || !avatarRef.current) return;

        const rect = avatarRef.current.getBoundingClientRect();
        const container = getPortalContainer();
        const containerRect = container === document.body ? { top: 0, left: 0 } : container.getBoundingClientRect();

        setDropdownPos({
            top: rect.bottom - containerRect.top + 8,
            right: window.innerWidth - rect.right - (container === document.body ? 0 : containerRect.left),
        });
    }, [open]);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handleClick = (e: MouseEvent) => {
            if (!avatarRef.current?.contains(e.target as Node) && !dropdownRef.current?.contains(e.target as Node)) {
                handleOnMenuClose();
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [open]);

    const logoutMutation = useMutation({
        mutationFn: async () => {
            await clearAllQueries();
            await logout();
        },
        onError: () => {
            globalAlertToastEventBus.emit('show-alert-toast', {
                title: 'Unable to logout !',
                description: 'Failed to logout from the application !',
                position: 'top-right',
                severity: 'error',
            });
        },
    });

    const handleOnMenuClose = () => {
        logoutMutation.reset();
        setOpen(false);
    };

    const menuItemBase = 'flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors duration-150 cursor-pointer';

    const dropdown = open
        ? createPortal(
              <div
                  ref={dropdownRef}
                  style={{ top: dropdownPos.top, right: dropdownPos.right }}
                  className="absolute z-9999 min-w-60 rounded-xl bg-white shadow-xl ring-1 ring-black/8 overflow-hidden animate-in fade-in slide-in-from-left-1 duration-150"
              >
                  {/* User info */}
                  <div className="px-3.5 pt-3 pb-2">
                      <p className="text-[13.5px] font-semibold leading-snug text-(--brand-title-primary-color) truncate">{userDisplayName}</p>
                  </div>

                  {/* View Mode */}
                  {appConfig?.cosmotics?.enableViewingModeToggle ? (
                      <div className="px-3.5 pb-2">
                          <div className="h-px bg-gray-100 mb-2" />
                          <div className="flex items-center gap-1.5 mb-1.5">
                              <Monitor size={12} className="text-(--brand-title-primary-color)" />
                              <span className="text-[11px] font-semibold text-(--brand-title-primary-color)">Viewing Size</span>
                          </div>
                          <div className="flex gap-1">
                              {viewModeOptions.map((opt) => (
                                  <button
                                      key={opt.value}
                                      onClick={() => setViewMode(opt.value)}
                                      className={`flex-1 text-center text-[10.5px] font-medium shadow-xs px-2 py-1 rounded-md transition-all duration-150 cursor-pointer
                                          ${viewMode === opt.value ? 'bg-(--brand-color) text-(--brand-text-inverse)' : 'bg-gray-100 text-(--brand-title-primary-color) hover:bg-(--brand-color) hover:text-white'}`}
                                  >
                                      {opt.label}
                                  </button>
                              ))}
                          </div>
                      </div>
                  ) : null}

                  {/* Menu items */}
                  <div className="px-2 pb-2">
                      <div className="h-px bg-gray-100 mb-1.5" />

                      {hasGroupMembership(appConfig.accessControl.pages.gbac.admin) ? (
                          <button
                              className={`${menuItemBase} text-(--brand-title-primary-color) hover:bg-(--brand-color) hover:text-(--brand-text-inverse)`}
                              onClick={() => {
                                  navigate({ to: '/settings', viewTransition: true });
                                  handleOnMenuClose();
                              }}
                          >
                              <Settings size={14} />
                              Settings
                          </button>
                      ) : null}

                      {appEnvConfig.enableDocsPage ? (
                          <button
                              className={`${menuItemBase} text-(--brand-title-primary-color) hover:bg-(--brand-color) hover:text-(--brand-text-inverse)`}
                              onClick={() => {
                                  navigate({ to: '/docs', viewTransition: true });
                                  handleOnMenuClose();
                              }}
                          >
                              <FileText size={14} />
                              Documentation
                          </button>
                      ) : null}

                      {appEnvConfig.enableDevSpacePage ? (
                          <button
                              className={`${menuItemBase} text-(--brand-title-primary-color) hover:bg-(--brand-color) hover:text-(--brand-text-inverse)`}
                              onClick={() => {
                                  navigate({ to: '/dev-temp-space', viewTransition: true });
                                  handleOnMenuClose();
                              }}
                          >
                              <Terminal size={14} />
                              Developer Test Space
                          </button>
                      ) : null}

                      {appEnvConfig.enableSiteMapPage ? (
                          <button
                              className={`${menuItemBase} text-(--brand-title-primary-color) hover:bg-(--brand-color) hover:text-(--brand-text-inverse)`}
                              onClick={() => {
                                  navigate({ to: '/sitemap', viewTransition: true });
                                  handleOnMenuClose();
                              }}
                          >
                              <FolderTree size={14} />
                              Site Map
                          </button>
                      ) : null}

                      <button
                          className={`${menuItemBase} text-red-500 hover:bg-red-400 hover:text-white disabled:opacity-50`}
                          onClick={() => logoutMutation.mutateAsync()}
                          disabled={logoutMutation.isPending}
                      >
                          {logoutMutation.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <LogOut size={14} />}
                          Log out
                      </button>
                  </div>

                  <div className="h-px bg-gray-100 mb-0" />

                  {/* License Info */}
                  {licenseCustomerName || licenseExp ? (
                      <div className="hidden px-3.5 py-2 bg-slate-50 border-t border-gray-100 flex flex-col gap-1 select-none">
                          <div className="flex items-center gap-1.5 text-(--brand-title-primary-color)">
                              <ShieldCheck size={13} className="shrink-0" />
                              <span className="text-[11px] font-semibold">License Information</span>
                          </div>
                          {licenseCustomerName ? (
                              <div className="flex items-center gap-1 text-[10.5px] text-gray-500 pl-4.5">
                                  <span className="text-gray-400">ATK License For</span>
                                  <span className="font-semibold text-gray-700 truncate max-w-32.5">
                                      <CopyText textClassName="text-[10.5px]" text={licenseCustomerName}></CopyText>
                                  </span>
                              </div>
                          ) : null}
                          {licenseExp ? (
                              <div className="flex items-center  gap-2 text-[10.5px] text-gray-500 pl-4.5">
                                  <span className="text-gray-400">Expires At:</span>
                                  <span className="font-medium text-gray-700 truncate">{licenseExp}</span>
                              </div>
                          ) : null}
                      </div>
                  ) : null}

                  <div className="h-px bg-gray-100 mb-0" />
                  <button disabled className={`${menuItemBase} bg-gray-0 text-gray-400 hover:bg-gray-0 hover:text-gray-400`}>
                      <Milestone size={14} />
                      Version ATK {packageJson.version}
                  </button>
              </div>,
              getPortalContainer(),
          )
        : null;

    return (
        <div className="sticky top-0 z-900 bg-(--brand-surface-color) shadow">
            <div className="flex items-center h-11.25 px-3 gap-5">
                {/* Left */}
                <div className="flex flex-1 items-center gap-5 min-w-0">
                    <Link to="/" className="flex shrink-0">
                        <ImageWithUnknowExt
                            baseSrcWithoutFileExtension={resolvePublicAssetPath('/brand-logo')}
                            fallbackSrc={resolvePublicAssetPath('/assets/shared/missing-image.svg')}
                            alt="brand-logo"
                            style={{ height: '25px', maxWidth: '150px' }}
                        />
                    </Link>
                    <div className="flex-1 min-w-0 overflow-hidden">
                        <AppBreadcrumbs maxItems={4} showHomeIcon={true} />
                    </div>
                </div>

                {/* Right */}
                <div className="flex items-center shrink-0">
                    <div
                        ref={avatarRef}
                        onClick={() => setOpen((v) => !v)}
                        className="btn-split split-blue-light w-8.75 h-8.75 rounded-full bg-gray-500 border border-white/30 flex items-center justify-center text-white text-[15px] font-semibold cursor-pointer shadow transition-all duration-150 hover:border-white/60 hover:scale-105 select-none"
                    >
                        <span> {userAvatarBadge} </span>
                    </div>
                </div>
            </div>

            {dropdown}
        </div>
    );
};

export default AppHeader;
