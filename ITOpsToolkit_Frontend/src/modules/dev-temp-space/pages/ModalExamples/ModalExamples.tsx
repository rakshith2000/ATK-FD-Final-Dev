import { useState } from 'react';
import Modal from '@/shared/components/ui/Modal/Modal';
import { Trash2, CheckCircle2, FileText, Maximize, Save } from 'lucide-react';
import logger from '@/shared/utils/logger';

export default function ModalExamples() {
    const [activeModal, setActiveModal] = useState<'basic' | 'destructive' | 'scrolling' | 'fullscreen' | 'persistent' | null>(null);

    const close = () => setActiveModal(null);

    return (
        <div className="p-8 flex flex-wrap gap-4">
            <button onClick={() => setActiveModal('basic')} className="px-4 py-2 bg-blue-500 text-white rounded">
                1. Standard Form (md)
            </button>
            <button onClick={() => setActiveModal('destructive')} className="px-4 py-2 bg-red-500 text-white rounded">
                2. Destructive / Strict (sm)
            </button>
            <button onClick={() => setActiveModal('scrolling')} className="px-4 py-2 bg-gray-600 text-white rounded">
                3. Long Content (2xl)
            </button>
            <button onClick={() => setActiveModal('fullscreen')} className="px-4 py-2 bg-purple-500 text-white rounded">
                4. Full Screen Data (full)
            </button>
            <button onClick={() => setActiveModal('persistent')} className="px-4 py-2 bg-amber-500 text-white rounded">
                5. Keep Mounted (DOM cached)
            </button>

            {/* ==========================================
                EXAMPLE 1: Standard Form Modal
                Good for: Standard edits, profile updates.
            ========================================== */}
            <Modal open={activeModal === 'basic'} onClose={close} size="xs" className="p-5">
                <Modal.Header>
                    <CheckCircle2 className="text-blue-500 w-5 h-5" />
                    <h3 className="text-sm font-semibold text-gray-800">Edit User Profile</h3>
                </Modal.Header>

                <Modal.Body>
                    <div className="space-y-4 py-2">
                        <div>
                            <label className="block text-gray-700 mb-1">Full Name</label>
                            <input type="text" className="w-full border rounded px-2 py-1.5" defaultValue="John Doe" />
                        </div>
                        <div>
                            <label className="block text-gray-700 mb-1">Email Address</label>
                            <input type="email" className="w-full border rounded px-2 py-1.5" defaultValue="john@example.com" />
                        </div>
                    </div>
                </Modal.Body>

                <Modal.Footer>
                    {/* Utilizing standard HTML props like type="button" and data-testid */}
                    <Modal.ActionButton variant="ghost" onClick={close} data-testid="cancel-btn">
                        Cancel
                    </Modal.ActionButton>
                    <Modal.ActionButton variant="primary" onClick={close}>
                        <Save className="w-3.5 h-3.5" />
                        Save Changes
                    </Modal.ActionButton>
                </Modal.Footer>
            </Modal>

            {/* ==========================================
                EXAMPLE 2: Destructive / Strict Modal
                Good for: Deletions. We disable outside clicks and Escape key.
            ========================================== */}
            <Modal open={activeModal === 'destructive'} onClose={close} size="sm" className="p-5" closeOnOutsideClick={false} closeOnEscapeKeyDown={false}>
                <Modal.Header className="text-red-600">
                    <Trash2 className="w-5 h-5" />
                    <h3 className="text-sm font-semibold">Delete Production Database?</h3>
                </Modal.Header>

                <Modal.Body>
                    <p className="text-gray-600">
                        This action cannot be undone. All data will be permanently wiped. You must explicitly click a button below to proceed or cancel.
                    </p>
                </Modal.Body>

                <Modal.Footer>
                    <Modal.ActionButton variant="secondary" onClick={close}>
                        Keep Data
                    </Modal.ActionButton>
                    <Modal.ActionButton
                        variant="danger"
                        onClick={() => {
                            logger.debug('Deleted!');
                            close();
                        }}
                    >
                        Yes, Delete It
                    </Modal.ActionButton>
                </Modal.Footer>
            </Modal>

            {/* ==========================================
                EXAMPLE 3: Scrolling Modal
                Good for: Terms of Service, Logs, Document viewing.
            ========================================== */}
            <Modal open={activeModal === 'scrolling'} onClose={close} size="2xl" className="p-5">
                <Modal.Header>
                    <FileText className="w-5 h-5 text-gray-500" />
                    <h3 className="text-sm font-semibold text-gray-800">Terms and Conditions</h3>
                </Modal.Header>

                {/* The Modal.Body automatically handles overflow-y-auto */}
                <Modal.Body className="text-gray-600 space-y-4">
                    <p>
                        <strong>1. Introduction</strong>
                        <br />
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.
                    </p>
                    {/* Simulating lots of text... */}
                    {Array.from({ length: 15 }).map((_, i) => (
                        <p key={i}>
                            Section {i + 2}: Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat
                            cupidatat non proident.
                        </p>
                    ))}
                </Modal.Body>

                <Modal.Footer className="justify-end">
                    <Modal.ActionButton variant="success" onClick={close} className="flex-none w-auto px-6">
                        I Agree
                    </Modal.ActionButton>
                </Modal.Footer>
            </Modal>

            {/* ==========================================
                EXAMPLE 4: Full Screen Modal
                Good for: Complex dashboards, image editors, maps.
            ========================================== */}
            <Modal open={activeModal === 'fullscreen'} onClose={close} size="full">
                <Modal.Header className="bg-gray-100 p-4 mb-0 pr-10 border-b">
                    <Maximize className="w-5 h-5 text-gray-600" />
                    <h3 className="text-base font-semibold text-gray-800">System Topology Map</h3>
                </Modal.Header>

                <Modal.Body className="mb-0 p-0 bg-slate-50 flex items-center justify-center">
                    <p className="text-slate-400 text-lg">Massive Canvas / Data Grid Goes Here</p>
                </Modal.Body>
            </Modal>

            {/* ==========================================
                EXAMPLE 5: Persistent Modal (KeepMounted)
                Good for: Modals with Heavy iFrames, complex charts, or multi-step forms where you don't want to lose state/destroy DOM nodes when closed.
            ========================================== */}
            <Modal
                open={activeModal === 'persistent'}
                onClose={close}
                size="lg"
                keepMounted={true} // <-- Will stay in the DOM as hidden when closed
                closeButtonClassName={'btn-split split-blue-light'}
                className="p-5"
            >
                <Modal.Header>
                    <h3 className="text-sm font-semibold text-gray-800">Heavy Background Task</h3>
                </Modal.Header>

                <Modal.Body>
                    <p>
                        Because <code>keepMounted</code> is true, this modal's DOM nodes are not destroyed when you close it. It simply hides using CSS. If you had a heavy chart or
                        a complex form state here, it would remain intact the next time you open it.
                    </p>
                </Modal.Body>

                <Modal.Footer>
                    <Modal.ActionButton variant="brand" onClick={close}>
                        Close (but keep in DOM)
                    </Modal.ActionButton>
                </Modal.Footer>
            </Modal>
        </div>
    );
}
