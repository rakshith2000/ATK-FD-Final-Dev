import React, { useState, useMemo, useCallback } from 'react';
import { Download, AlertTriangle } from 'lucide-react';

import TransferList from '@/shared/components/ui/TransferList/TransferList';
import type { TransferListItem } from '@/shared/components/ui/TransferList/TransferList';
import Modal from '@/shared/components/ui/Modal/Modal';
import type { SerializableFieldConfig } from '../../../types/form-config';
import { dictionaryRowToFieldConfig } from '../../../services/snow-dictionary-introspection';
import type { SnowDictionaryRow } from '../../../services/snow-dictionary-introspection';
import { useDictionaryFieldsQuery } from '../../../hooks/useDictionaryFieldsQuery';

interface SnowDictionaryImportProps {
    existingFieldNames: string[];
    dictName: string;
    onImport: (fields: SerializableFieldConfig[]) => void;
    onClose: () => void;
}

type DictionaryTransferItem = TransferListItem<SnowDictionaryRow>;

/** Build a transfer list item from a dictionary row.
 *  All values are guaranteed strings by normaliseRow, but we use String() as a safety net
 *  to prevent React "Objects are not valid as a React child" errors. */
function toTransferItem(row: SnowDictionaryRow, isExisting: boolean): DictionaryTransferItem {
    const label = String(row.column_label || '') || String(row.element || '');
    const element = String(row.element || '');
    const type = String(row.internal_type || '');
    const ref = row.reference ? String(row.reference) : '';
    const mandatory = String(row.mandatory) === 'true';

    return {
        key: element,
        label: row.column_label ? `${label} (${element})` : element,
        description: `${type}${mandatory ? ' * required' : ''}${ref ? ` -> ${ref}` : ''}${isExisting ? ' * (exists)' : ''}`,
        meta: row,
    };
}

const SnowDictionaryImport: React.FC<SnowDictionaryImportProps> = ({ existingFieldNames, dictName, onImport, onClose }) => {
    const [selectedItems, setSelectedItems] = useState<DictionaryTransferItem[]>([]);

    const existingSet = useMemo(() => new Set(existingFieldNames), [existingFieldNames]);

    const { data: rows, isLoading, error, isFetched } = useDictionaryFieldsQuery(dictName || undefined);

    const availableItems = useMemo(() => {
        if (!rows) return [];
        return rows.map((row) => toTransferItem(row, existingSet.has(row.element)));
    }, [rows, existingSet]);

    // Pre-select existing fields when data arrives
    const hasFetched = isFetched && !!dictName;

    useMemo(() => {
        if (rows) {
            const allItems = rows.map((row) => toTransferItem(row, existingSet.has(row.element)));
            setSelectedItems(allItems.filter((item) => existingSet.has(item.key)));
        }
    }, [rows, existingSet]);

    const handleImport = useCallback(() => {
        const name = (dictName || '').trim().toLowerCase();
        // Use meta (the SnowDictionaryRow) directly from each selected item - no lookup needed
        const configs = selectedItems.map((item) => (item.meta ? dictionaryRowToFieldConfig(item.meta, name) : null)).filter((c): c is SerializableFieldConfig => c !== null);
        onImport(configs);
    }, [selectedItems, dictName, onImport]);

    return (
        <Modal open onClose={onClose} size="full" closeOnOutsideClick={false} className="p-5" closeButtonClassName="btn-split split-blue-light">
            <Modal.Header>
                <div>
                    <h2 className="text-sm font-semibold text-gray-800">Import Fields from ServiceNow Dictionary</h2>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                        Selected ServiceNow Dictionary: <span className="font-semibold text-blue-600 font-mono">{dictName}</span>
                        {existingFieldNames.length > 0 && (
                            <span className="text-emerald-500 ml-1">
                                ({existingFieldNames.length} existing field{existingFieldNames.length === 1 ? '' : 's'} will be pre-selected)
                            </span>
                        )}
                    </p>
                </div>
            </Modal.Header>

            <Modal.Body>
                {/* Information Banner */}
                {isLoading ? (
                    <div className="py-2.5 border-b border-gray-100 bg-gray-50/50 -mx-4 px-4 mb-3 rounded-t w-full">
                        <p className="text-xs text-gray-600 font-medium">
                            Loading fields for ServiceNow Dictionary: <span className="font-semibold text-blue-600 font-mono">{dictName || '(None)'}</span>
                        </p>
                    </div>
                ) : null}

                {/* Error */}
                {error && (
                    <div className="mb-3 flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-md">
                        <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-[11px] font-medium text-red-700">Failed to fetch fields</p>
                            <p className="text-[10px] text-red-600 mt-0.5">{error.message}</p>
                        </div>
                    </div>
                )}

                {/* Transfer List */}
                {!hasFetched && !isLoading && !error && (
                    <div className="flex items-center justify-center h-60 text-xs text-gray-400">No ServiceNow Dictionary table name resolved to fetch fields.</div>
                )}
                {(hasFetched || isLoading) && (
                    <TransferList
                        available={availableItems}
                        selected={selectedItems}
                        onChange={setSelectedItems as (items: TransferListItem[]) => void}
                        availableTitle="Dictionary Fields"
                        selectedTitle="Fields to Import"
                        searchPlaceholder="Search by label or field name..."
                        height="calc(75dvh - 100px)"
                        isLoading={isLoading}
                    />
                )}
                {hasFetched && availableItems.length === 0 && !isLoading && (
                    <p className="text-center text-[11px] text-amber-600 mt-2">
                        No fields found for table &quot;{dictName}&quot;. Check the table name or verify access permissions.
                    </p>
                )}
            </Modal.Body>

            <Modal.Footer className="flex justify-between items-center w-full">
                <p className="text-[10px] text-gray-400 flex-1 justify-start">
                    {selectedItems.length > 0
                        ? `${selectedItems.length} field${selectedItems.length === 1 ? '' : 's'} selected - will be added with pre-configured type, validation, and async options`
                        : 'Select fields from the left panel to import'}
                </p>
                <div className="flex gap-2 flex-1 justify-end">
                    <Modal.ActionButton onClick={onClose} variant="secondary" className="max-w-30 truncate">
                        Cancel
                    </Modal.ActionButton>
                    <Modal.ActionButton onClick={handleImport} variant="primary" className="max-w-30 truncate" disabled={selectedItems.length === 0}>
                        <Download size={12} />
                        Import {selectedItems.length > 0 ? `${selectedItems.length} Field${selectedItems.length === 1 ? '' : 's'}` : 'Fields'}
                    </Modal.ActionButton>
                </div>
            </Modal.Footer>
        </Modal>
    );
};

export default SnowDictionaryImport;
