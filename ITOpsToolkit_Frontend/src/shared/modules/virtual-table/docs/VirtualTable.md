# VirtualTable

A high-performance, feature-rich compound-component table built on [TanStack Table v8](https://tanstack.com/table/latest) and
[TanStack Virtual](https://tanstack.com/virtual/latest). It virtualises rows so that even 50 000+ row datasets render smoothly.

---

## Quick Start

```tsx
import { VirtualTable, type VirtualTableColumnDef } from '@/shared/components/smart/VirtualTable';

const columns: VirtualTableColumnDef<MyData>[] = [
    { id: 'name', accessorKey: 'name', header: 'Name' },
    { id: 'email', accessorKey: 'email', header: 'Email' },
];

<VirtualTable data={rows} columns={columns}>
    <VirtualTable.Toolbar>
        <VirtualTable.GlobalSearch />
        <VirtualTable.ColumnConfig />
    </VirtualTable.Toolbar>
    <VirtualTable.Content />
</VirtualTable>;
```

---

## Compound Components

| Component                     | Purpose                                         |
| ----------------------------- | ----------------------------------------------- |
| `<VirtualTable>`              | Root provider — wraps children in table context |
| `<VirtualTable.Toolbar>`      | Toolbar container (search, buttons, etc.)       |
| `<VirtualTable.Content>`      | Virtualised table body (headers, filters, rows) |
| `<VirtualTable.GlobalSearch>` | Debounced global search input                   |
| `<VirtualTable.ColumnConfig>` | Column visibility / order / pinning panel       |
| `<VirtualTable.FilterConfig>` | Column filter visibility toggle                 |
| `<VirtualTable.SortConfig>`   | Active sort indicator / reset                   |
| `<VirtualTable.RowInfo>`      | Row count badge                                 |
| `<VirtualTable.SelectedRows>` | Render-prop for selected row data               |
| `<VirtualTable.AddRow>`       | Toolbar button to add a new row                 |
| `<VirtualTable.DeleteRow>`    | Toolbar button to delete selected rows          |

---

## Props (`VirtualTableProps<TData>`)

### Data & Columns

| Prop       | Type                             | Default | Description                  |
| ---------- | -------------------------------- | ------- | ---------------------------- |
| `data`     | `TData[]`                        | —       | Row data array               |
| `columns`  | `VirtualTableColumnDef<TData>[]` | —       | Column definitions           |
| `getRowId` | `(row, index) => string`         | —       | Stable row identity function |

### Virtualisation

| Prop                | Type     | Default | Description                          |
| ------------------- | -------- | ------- | ------------------------------------ |
| `estimateRowHeight` | `number` | `52`    | Estimated row height (px)            |
| `overscan`          | `number` | `10`    | Extra rows rendered outside viewport |

### Feature Toggles

| Prop                      | Type      | Default | Description                 |
| ------------------------- | --------- | ------- | --------------------------- |
| `enableSorting`           | `boolean` | `true`  | Column sorting              |
| `enableColumnFilters`     | `boolean` | `true`  | Per-column filters          |
| `enableGlobalFilter`      | `boolean` | `true`  | Global search               |
| `enableColumnResizing`    | `boolean` | `true`  | Drag-resize columns         |
| `enableColumnPinning`     | `boolean` | `true`  | Pin columns left / right    |
| `enableColumnVisibility`  | `boolean` | `true`  | Show / hide columns         |
| `enableRowSelection`      | `boolean` | `false` | Checkbox row selection      |
| `enableMultiRowSelection` | `boolean` | `true`  | Multi-select (when enabled) |

### Row Selection

| Prop                    | Type                              | Description                  |
| ----------------------- | --------------------------------- | ---------------------------- |
| `onRowSelectionChange`  | `(selectedRows: TData[]) => void` | Fires when selection changes |
| `selectionColumnPinned` | `'left' \| 'right'`               | Auto-pin the checkbox column |
| `onRowClick`            | `(row, event) => void`            | Row click handler            |

### Row Expansion

| Prop                 | Type                                           | Description                                                                        |
| -------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------- |
| `renderSubComponent` | `(props: { row: Row<TData> }) => ReactElement` | Render function for the expanded content below a row                               |
| `getRowCanExpand`    | `(row: Row<TData>) => boolean`                 | Per-row predicate (defaults to `() => true` when `renderSubComponent` is provided) |

When `renderSubComponent` is provided an **expander column** (chevron toggle) is automatically prepended and pinned to the left. Each virtual row is wrapped in its own `<tbody>` so
the virtualiser's `ResizeObserver` correctly measures the combined height of the row + expanded sub-component.

### Inline Editing

| Prop         | Type                                                        | Description                                                                      |
| ------------ | ----------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `updateData` | `(rowId: string, columnId: string, value: unknown) => void` | Callback fired when a cell value is edited. Receives the row id from `getRowId`. |

Editing is driven by **column meta** (see below) and **table meta** state:

- `table.options.meta.editingRowIds` — `Record<string, boolean>` of rows in edit mode
- `table.options.meta.setEditingRowIds` — state setter to toggle edit mode

Typically the action column's "Edit" button calls `setEditingRowIds` to enter edit mode, and a "Done" / "Cancel" button removes the row from the map.

### Add Row

| Prop          | Type                                | Default     | Description                                                                                             |
| ------------- | ----------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------- |
| `onAddRow`    | `() => string \| undefined \| void` | —           | Called when the Add Row button is clicked. Must add a row to data and return its id for auto-edit mode. |
| `addRowLabel` | `string`                            | `'Add Row'` | Default label for the Add Row button (can be overridden per-instance via the component prop).           |

`<VirtualTable.AddRow>` props:

| Prop        | Type             | Default                      | Description                                                                          |
| ----------- | ---------------- | ---------------------------- | ------------------------------------------------------------------------------------ |
| `label`     | `string`         | `addRowLabel` or `'Add Row'` | Override button label                                                                |
| `icon`      | `ReactNode`      | `<Plus size={14} />`         | Icon rendered before the label                                                       |
| `onClick`   | `() => void`     | —                            | Fully override click — skips `onAddRow` and auto-edit. Use for modals / custom forms |
| `className` | `ClassNameValue` | —                            | Additional CSS classes for the button                                                |

### Delete Row

| Prop             | Type                      | Default    | Description                                                                                  |
| ---------------- | ------------------------- | ---------- | -------------------------------------------------------------------------------------------- |
| `onDeleteRow`    | `(rowId: string) => void` | —          | Called to delete a row. The consumer must remove the row from the data array.                |
| `deleteRowLabel` | `string`                  | `'Delete'` | Default label for the Delete Row button (can be overridden per-instance via component prop). |

`<VirtualTable.DeleteRow>` props:

| Prop        | Type             | Default                        | Description                                                     |
| ----------- | ---------------- | ------------------------------ | --------------------------------------------------------------- |
| `label`     | `string`         | `deleteRowLabel` or `'Delete'` | Override button label                                           |
| `icon`      | `ReactNode`      | `<Trash2 size={14} />`         | Icon rendered before the label                                  |
| `onClick`   | `() => void`     | —                              | Fully override click — skips `onDeleteRow` and default behavior |
| `className` | `ClassNameValue` | —                              | Additional CSS classes for the button                           |

### State Placeholders

| Prop             | Type          | Default               | Description            |
| ---------------- | ------------- | --------------------- | ---------------------- |
| `isLoading`      | `boolean`     | `false`               | Show skeleton loader   |
| `loadingMessage` | `string`      | —                     | Text below skeleton    |
| `error`          | `Error\|null` | `null`                | Show error placeholder |
| `errorTitle`     | `string`      | —                     | Error heading          |
| `onRetry`        | `() => void`  | —                     | Retry button callback  |
| `emptyTitle`     | `string`      | `'No results'`        | Empty state heading    |
| `emptyMessage`   | `string`      | `'No data available'` | Empty state body       |

### Manual / Remote Data

| Prop                | Type                             | Description                           |
| ------------------- | -------------------------------- | ------------------------------------- |
| `manualSorting`     | `true`                           | Disables client-side sorting          |
| `manualFiltering`   | `true`                           | Column filter functions become no-ops |
| `onSortingChange`   | `OnChangeFn<SortingState>`       | Required when `manualSorting`         |
| `onFilteringChange` | `OnChangeFn<ColumnFiltersState>` | Required when `manualFiltering`       |

### Initial State

| Prop                      | Type                 | Description                         |
| ------------------------- | -------------------- | ----------------------------------- |
| `initialSorting`          | `SortingState`       | Sort state on mount                 |
| `initialColumnFilters`    | `ColumnFiltersState` | Filter state on mount               |
| `initialColumnVisibility` | `VisibilityState`    | Hidden columns on mount             |
| `initialColumnOrder`      | `ColumnOrderState`   | Column order on mount               |
| `initialColumnPinning`    | `ColumnPinningState` | Pinned columns on mount             |
| `initialFiltersVisible`   | `boolean`            | Filter row visible (default `true`) |

### Style Overrides (`classNames`)

Every visual region can be styled via the `classNames` prop (`VirtualTableClassNames`). Key slots:

```
root, toolbar, tableWrapper, table, thead, theadRow, theadCell,
filterRow, filterCell, tbody, tbodyRow, tbodyCell, pinnedLeft,
pinnedRight, sortIcon, resizeHandle, emptyState, loadingState,
globalSearch, columnConfigPanel, filterConfigPanel, sortConfigPanel,
searchHighlight, columnFilterHighlight,
expandedSubRow, editingRow, editInput, editInputError
```

---

## Column Meta (`ColumnMeta<TData>`)

`ColumnMeta` is generic — when used inside `VirtualTableColumnDef<TData>` the type parameter is inferred automatically, giving full typing for callbacks like `canEdit`.

### Filter Configuration

| Property                     | Type                                                                                      | Description                                     |
| ---------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `filterType`                 | `'text' \| 'select' \| 'number-range' \| 'date-range' \| 'boolean' \| 'search' \| 'tags'` | Filter input type                               |
| `filterOptions`              | `FilterOption[] \| (args) => FilterOption[]`                                              | Static or derived options for select filter     |
| `filterOptionsAsync`         | `(searchTerm: string) => Promise<FilterOption[]>`                                         | Async option fetcher (debounced)                |
| `filterOptionsAsyncDebounce` | `number`                                                                                  | Debounce ms (default `300`)                     |
| `filterPlaceholder`          | `string`                                                                                  | Input placeholder                               |
| `filterMultiSelect`          | `boolean`                                                                                 | Multi-select mode for select filter             |
| `filterComponent`            | `ComponentType<CustomFilterComponentProps<TData>>`                                        | Fully custom filter UI (overrides `filterType`) |

### Edit Configuration

| Property                   | Type                                                              | Description                                                          |
| -------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------- |
| `canEdit`                  | `boolean \| (row: Row<TData>) => boolean`                         | Whether this column is editable (can be per-row)                     |
| `editType`                 | `'text' \| 'number' \| 'select' \| 'boolean' \| 'date' \| 'tags'` | Edit input type (falls back to `filterType` mapping)                 |
| `editComponent`            | `ComponentType<EditCellProps<TData>>`                             | Fully custom edit UI                                                 |
| `editOptions`              | `FilterOption[] \| (args) => FilterOption[]`                      | Options for select editor (falls back to `filterOptions`)            |
| `editOptionsAsync`         | `(searchTerm: string) => Promise<FilterOption[]>`                 | Async options for select editor (falls back to `filterOptionsAsync`) |
| `editOptionsAsyncDebounce` | `number`                                                          | Debounce ms (default `300`)                                          |
| `editPlaceholder`          | `string`                                                          | Placeholder for editor input                                         |
| `editValidation`           | `(value: unknown) => string \| null`                              | Returns `null` if valid, error message string otherwise              |

### Tag Configuration

| Property       | Type     | Default | Description                                                                  |
| -------------- | -------- | ------- | ---------------------------------------------------------------------------- |
| `tagSeparator` | `string` | `','`   | Separator used to split/join tag strings (applies to both filter and editor) |

### General

| Property | Type     | Description                                                  |
| -------- | -------- | ------------------------------------------------------------ |
| `label`  | `string` | Display label in ColumnConfig panel (falls back to `header`) |

---

## Helpers & Utilities

### `createActionColumn<TData>(config)`

Creates a fixed-width action column with icon buttons.

```tsx
import { createActionColumn } from '@/shared/components/smart/VirtualTable';

createActionColumn<MyData>({
  actions: [
    { id: 'edit', label: 'Edit', icon: <Pencil size={14} />, onClick: (row) => { ... } },
    { id: 'delete', label: 'Delete', icon: <Trash2 size={14} />, onClick: (row) => { ... },
      hidden: (row) => row.status === 'archived' },
  ],
  header: 'Actions',
  size: 100,
});
```

Each action supports `hidden(row)`, `disabled(row)`, and custom `className`.

### `ExpanderColumn<TData>()`

Auto-generated when `renderSubComponent` is provided. Can also be created manually:

```tsx
import { ExpanderColumn } from '@/shared/components/smart/VirtualTable';

const columns = [ExpanderColumn<MyData>(), ...dataColumns];
```

### Sort Functions

| Export                          | Use case                      |
| ------------------------------- | ----------------------------- |
| `dateSortFn`                    | ISO date strings              |
| `dateTimeSortFn`                | ISO datetime strings          |
| `numericSortFn`                 | Numeric strings               |
| `booleanSortFn`                 | Boolean values                |
| `alphanumericInsensitiveSortFn` | Case-insensitive alphanumeric |
| `prioritySortFn`                | "1 - Critical" style values   |

### Filter Functions

`filterFnMap` maps each `FilterType` to its built-in filter implementation. Custom filter functions can be assigned directly on the column definition via `filterFn`.

---

## Row Expansion

Provide `renderSubComponent` to enable row expansion. An expander column is auto-prepended and pinned left.

```tsx
const SubComponent = ({ row }: { row: Row<MyData> }) => (
    <div className="p-4">
        <h4>{row.original.name}</h4>
        <p>{row.original.description}</p>
    </div>
);

<VirtualTable data={data} columns={columns} renderSubComponent={SubComponent} getRowCanExpand={(row) => row.original.hasDetails}>
    ...
</VirtualTable>;
```

### How it works with virtualisation

Each virtual row is rendered inside its own `<tbody>` element. When a row is expanded, the sub-component `<tr>` is rendered as a sibling inside the same `<tbody>`. The
virtualiser's `measureElement` ref is placed on the `<tbody>`, so the `ResizeObserver` correctly tracks the combined height of the data row plus the expanded content. This avoids
the overlap issues that occur when only the `<tr>` is measured.

### Updating data from sub-components

The sub-component can access `table.options.meta.updateData` to modify cell values from within the expanded panel:

```tsx
const SubComponent = ({ row }: { row: Row<MyData> }) => {
    const table = row.getAllCells()[0]?.getContext().table;
    const updateData = table?.options.meta?.updateData;

    return <button onClick={() => updateData?.(row.id, 'status', 'resolved')}>Resolve</button>;
};
```

---

## Inline Editing

Inline editing is column-driven via `ColumnMeta` and row-driven via `table.options.meta.editingRowIds`.

### 1. Mark columns as editable

```tsx
const columns: VirtualTableColumnDef<MyData>[] = [
    {
        id: 'name',
        accessorKey: 'name',
        header: 'Name',
        meta: {
            canEdit: true, // always editable
            editType: 'text', // text input
            editValidation: (v) => (String(v).length < 3 ? 'Min 3 chars' : null),
        },
    },
    {
        id: 'priority',
        accessorKey: 'priority',
        header: 'Priority',
        meta: {
            canEdit: (row) => row.original.status !== 'closed', // conditional
            editType: 'select',
            editOptions: [
                { label: 'High', value: 'high' },
                { label: 'Low', value: 'low' },
            ],
        },
    },
];
```

### 2. Provide `updateData`

```tsx
const [data, setData] = useState(initialData);

const updateData = (rowId: string, columnId: string, value: unknown) => {
    setData((prev) => prev.map((row) => (row.id !== rowId ? row : { ...row, [columnId]: value })));
};

<VirtualTable data={data} columns={columns} getRowId={(row) => row.id} updateData={updateData}>
    ...
</VirtualTable>;
```

### 3. Toggle edit mode from an action column

```tsx
{
  id: '__actions',
  cell: ({ row, table }) => {
    const isEditing = table.options.meta?.editingRowIds?.[row.id];
    const setEditing = table.options.meta?.setEditingRowIds;

    if (isEditing) {
      return (
        <button onClick={() =>
          setEditing?.((prev) => { const next = { ...prev }; delete next[row.id]; return next; })
        }>
          Done
        </button>
      );
    }

    return (
      <button onClick={() => setEditing?.((prev) => ({ ...prev, [row.id]: true }))}>
        Edit
      </button>
    );
  },
}
```

### Edit type fallback

If `editType` is not set, it falls back from `filterType`:

| `filterType`     | Inferred `editType` |
| ---------------- | ------------------- |
| `text`, `search` | `text`              |
| `select`         | `select`            |
| `number-range`   | `number`            |
| `date-range`     | `date`              |
| `boolean`        | `boolean`           |
| `tags`           | `tags`              |

### Custom edit component

Override the default editor with any React component. The component receives `EditCellProps<TData>`:

```tsx
meta: {
  canEdit: true,
  editComponent: ({ value, onChange, onBlur, validationError }) => (
    <div>
      <MyFancyInput value={value} onChange={onChange} onBlur={onBlur} />
      {validationError && <span className="text-red-500">{validationError}</span>}
    </div>
  ),
}
```

#### Example: Using `Input.SelectField` as a custom editor

```tsx
import Input from '@/shared/components/smart/InputFields';
import type { EditCellProps } from '@/shared/components/smart/VirtualTable';

const CATEGORIES = ['Network', 'Hardware', 'Software', 'Security'];

const CustomSelectEditor = ({ value, onChange, onBlur }: EditCellProps<MyData>) => (
    <Input.SelectField
        value={(value as string) ?? ''}
        onChange={(val) => {
            onChange(Array.isArray(val) ? val[0] ?? '' : val);
            onBlur();
        }}
        onBlur={onBlur}
        options={CATEGORIES.map((c) => ({ label: c, value: c }))}
        placeholder="Pick category..."
        multiple={false}
        variant="outlined"
        customStyles={{ height: '28px', inputFontSize: '11px', labelFontSize: '10px' }}
    />
);

// In column definition:
{
    id: 'category',
    accessorKey: 'category',
    header: 'Category',
    meta: {
        canEdit: true,
        editComponent: CustomSelectEditor,
    },
}
```

### Custom filter component

Override the default filter with any React component. The component receives `CustomFilterComponentProps<TData>`. Note: `filterType` is still required so the filter row renders.

```tsx
meta: {
  filterType: 'text', // still needed so the filter row renders
  filterComponent: ({ value, onChange, column, table }) => (
    <MyCustomFilterInput value={value} onChange={onChange} />
  ),
}
```

#### Example: Using `Input.TextField` as a custom filter

```tsx
import Input from '@/shared/components/smart/InputFields';
import type { CustomFilterComponentProps } from '@/shared/components/smart/VirtualTable';

const CustomTextFilter = ({ value, onChange }: CustomFilterComponentProps<MyData>) => (
    <Input.TextField
        value={(value as string) ?? ''}
        onChange={(val) => onChange(val || undefined)}
        placeholder="Custom filter..."
        variant="outlined"
        customStyles={{ height: '28px', inputFontSize: '11px', labelFontSize: '10px' }}
    />
);

// In column definition:
{
    id: 'category',
    accessorKey: 'category',
    header: 'Category',
    meta: {
        filterType: 'select',           // determines the filter function used
        filterComponent: CustomTextFilter, // overrides the default select filter UI
    },
}
```

> **Tip:** `filterType` determines which **filter function** is used for matching rows. `filterComponent` only overrides the **UI**. You can mix any filter function with any custom
> UI.

---

## Tags

The `tags` filter and edit types support columns where cell values contain multiple tags joined by a configurable separator (default: comma).

### Column definition

```tsx
{
    id: 'tags',
    accessorKey: 'tags',
    header: 'Tags',
    size: 200,
    meta: {
        filterType: 'tags',
        tagSeparator: ',',           // default — any single character works
        filterPlaceholder: 'Filter tags...',
        canEdit: true,
        editType: 'tags',            // auto-inferred from filterType if omitted
        editPlaceholder: 'Add tag...',
    },
    // Optional: render tags as badges when not editing
    cell: ({ getValue, row, table }) => {
        if (table.options.meta?.editingRowIds?.[row.id]) return getValue<string>();
        const raw = getValue<string>();
        if (!raw) return '—';
        return (
            <div className="flex flex-wrap gap-1">
                {raw.split(',').map((t) => t.trim()).filter(Boolean).map((tag, i) => (
                    <span key={`${tag}-${i}`} className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                        {tag}
                    </span>
                ))}
            </div>
        );
    },
}
```

### How it works

- **Data format:** tags are stored as a single string with a separator, e.g. `"network, vpn, urgent"`. The separator and number of tags are arbitrary.
- **Filter:** the `TagFilter` dropdown extracts all unique tags from the column data and shows them as checkable chips. A row passes if it contains **all** selected tags.
- **Editor:** the `TagEditor` renders tags as removable chips with an inline text input. Press <kbd>Enter</kbd>, the separator key, or <kbd>Tab</kbd> to add a tag.
  <kbd>Backspace</kbd> removes the last tag. Duplicate tags (case-insensitive) are rejected.
- **Separator:** configure via `tagSeparator` in column meta. Both the filter and editor use this value. Defaults to `','`.

---

## Add Row

The **Add Row** feature lets users insert new rows directly from the toolbar. When the button is clicked, the `onAddRow` callback fires — the consumer adds a new row to their data
array and optionally returns the new row's id to auto-enter edit mode.

### Quick start

```tsx
const [data, setData] = useState<MyData[]>(initialData);

let nextId = data.length;

const handleAddRow = () => {
    const newId = String(++nextId);
    setData((prev) => [...prev, { id: newId, name: '', email: '', status: 'draft' }]);
    return newId; // returning the id auto-enters edit mode
};

const updateData = (rowId: string, columnId: string, value: unknown) => {
    setData((prev) => prev.map((row) => (row.id !== rowId ? row : { ...row, [columnId]: value })));
};

<VirtualTable data={data} columns={columns} getRowId={(row) => row.id} onAddRow={handleAddRow} updateData={updateData}>
    <VirtualTable.Toolbar>
        <VirtualTable.GlobalSearch />
        <VirtualTable.AddRow />
    </VirtualTable.Toolbar>
    <VirtualTable.Content />
</VirtualTable>;
```

### How it works

1. User clicks the `<VirtualTable.AddRow>` button in the toolbar.
2. The `onAddRow` callback fires — the consumer pushes a new row into the `data` array.
3. If `onAddRow` returns a **row id** (string), the table automatically enters **edit mode** for that row so the user can immediately fill in values inline.
4. The user edits cells and clicks "Done" (via an action column) to commit, or "Cancel" to discard.

### Customising the button

```tsx
{
    /* Custom label */
}
<VirtualTable.AddRow label="New Employee" />;

{
    /* Custom icon */
}
<VirtualTable.AddRow icon={<UserPlus size={14} />} label="Add Member" />;

{
    /* Custom styling */
}
<VirtualTable.AddRow className="bg-green-50 border-green-300 text-green-700 hover:bg-green-100" />;
```

### Without auto-edit

If you don't want the new row to enter edit mode, return `undefined` from `onAddRow`:

```tsx
const handleAddRow = () => {
    setData((prev) => [...prev, createDefaultRow()]);
    // no return — row is added but not in edit mode
};
```

### Custom modal / form (onClick override)

Pass an `onClick` prop to fully override the default behavior. When `onClick` is provided, `onAddRow` and auto-edit are **skipped entirely** — you control the entire flow.

This is useful when you want a richer form experience (validation, async fields, multi-step wizards) instead of inline editing.

> **Note:** When using `onClick`, you don't need the `onAddRow` prop on `<VirtualTable>` — the button renders as long as either `onAddRow` or `onClick` is provided.

#### 1. Create the form component

Uses the project's `@tanstack/react-form` + `zod` pattern (same as `CreateKBArticleForm`).

```tsx
// AddIncidentForm.tsx
import { useForm, useStore } from '@tanstack/react-form';
import { Save } from 'lucide-react';
import z from 'zod';
import Input from '@/shared/components/smart/InputFields';
import FormSubmitButton from '@/shared/components/ui/FormSubmitButton/FormSubmitButton';

const addIncidentSchema = z.object({
    short_description: z.string().min(5, 'Must be at least 5 characters'),
    assigned_to: z.string().nonempty('Assignee is required'),
    priority: z.string().nonempty('Priority is required'),
    category: z.string().nonempty('Category is required'),
});

export type AddIncidentValues = z.infer<typeof addIncidentSchema>;

interface AddIncidentFormProps {
    onSubmit: (values: AddIncidentValues) => void | Promise<void>;
}

const priorityOptions = [
    { label: '1 - Critical', value: '1 - Critical' },
    { label: '2 - High', value: '2 - High' },
    { label: '3 - Moderate', value: '3 - Moderate' },
    { label: '4 - Low', value: '4 - Low' },
];

const categoryOptions = [
    { label: 'Network', value: 'Network' },
    { label: 'Hardware', value: 'Hardware' },
    { label: 'Software', value: 'Software' },
];

const AddIncidentForm: React.FC<AddIncidentFormProps> = ({ onSubmit }) => {
    const form = useForm({
        defaultValues: {
            short_description: '',
            assigned_to: '',
            priority: '',
            category: '',
        },
        validators: { onSubmit: addIncidentSchema },
        onSubmit: async ({ value }) => onSubmit(value),
    });

    const isSubmitting = useStore(form.store, (s) => s.isSubmitting);

    return (
        <form className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
                <form.Field name="short_description">
                    {(field) => <Input.TextField tanstackFieldApi={field} label="Short Description" placeholder="Enter description..." required disabled={isSubmitting} />}
                </form.Field>

                <div className="flex gap-4">
                    <div className="flex-1">
                        <form.Field name="assigned_to">
                            {(field) => <Input.TextField tanstackFieldApi={field} label="Assigned To" placeholder="Enter assignee..." required disabled={isSubmitting} />}
                        </form.Field>
                    </div>
                    <div className="flex-1">
                        <form.Field name="priority">
                            {(field) => (
                                <Input.SelectField
                                    tanstackFieldApi={field}
                                    options={priorityOptions}
                                    label="Priority"
                                    placeholder="Select priority..."
                                    multiple={false}
                                    required
                                    disabled={isSubmitting}
                                />
                            )}
                        </form.Field>
                    </div>
                </div>

                <form.Field name="category">
                    {(field) => (
                        <Input.SelectField
                            tanstackFieldApi={field}
                            options={categoryOptions}
                            label="Category"
                            placeholder="Select category..."
                            multiple={false}
                            required
                            disabled={isSubmitting}
                        />
                    )}
                </form.Field>
            </div>

            <form.Subscribe selector={(s) => ({ isSubmitting: s.isSubmitting, canSubmit: s.canSubmit })}>
                {({ isSubmitting, canSubmit }) => (
                    <FormSubmitButton
                        isSubmitting={isSubmitting}
                        disabled={!canSubmit || isSubmitting}
                        onClick={form.handleSubmit}
                        label="Create Incident"
                        submittingLabel="Creating..."
                        icon={<Save size={14} />}
                    />
                )}
            </form.Subscribe>
        </form>
    );
};

export default AddIncidentForm;
```

#### 2. Wire it up with `Modal` and `VirtualTable.AddRow`

```tsx
import { useState } from 'react';
import { Plus } from 'lucide-react';
import Modal from '@/shared/components/ui/Modal/Modal';
import { VirtualTable } from '@/shared/components/smart/VirtualTable';
import AddIncidentForm, { type AddIncidentValues } from './AddIncidentForm';

const IncidentTable = () => {
    const [data, setData] = useState(initialData);
    const [showAddModal, setShowAddModal] = useState(false);

    const handleFormSubmit = (values: AddIncidentValues) => {
        const newId = String(Date.now());
        setData((prev) => [{ id: newId, ...values }, ...prev]);
        setShowAddModal(false);
    };

    return (
        <>
            <VirtualTable data={data} columns={columns} getRowId={(row) => row.id}>
                <VirtualTable.Toolbar>
                    <VirtualTable.GlobalSearch />
                    <VirtualTable.AddRow label="New Incident" icon={<Plus size={14} />} onClick={() => setShowAddModal(true)} />
                </VirtualTable.Toolbar>
                <VirtualTable.Content />
            </VirtualTable>

            <Modal open={showAddModal} onClose={() => setShowAddModal(false)} size="md">
                <Modal.Header>
                    <h3 className="text-sm font-semibold text-gray-800">Create Incident</h3>
                </Modal.Header>
                <Modal.Body>
                    <AddIncidentForm onSubmit={handleFormSubmit} />
                </Modal.Body>
            </Modal>
        </>
    );
};
```

#### Key differences from inline add-row

|                        | Inline (`onAddRow`)           | Modal (`onClick`)                     |
| ---------------------- | ----------------------------- | ------------------------------------- |
| Row appears in table   | Immediately, in edit mode     | After form submit                     |
| Validation             | Per-cell via `editValidation` | Full form via `zod` schema            |
| UX                     | Quick single-field edits      | Rich multi-field forms, async selects |
| Cancel                 | Discards the empty row        | Just closes the modal                 |
| `onAddRow` prop needed | Yes                           | No                                    |

---

## Delete Row

The **Delete Row** feature lets users remove rows from the table. It supports both **single-row deletion** (via action columns) and **bulk deletion** (via the toolbar button with
selected rows).

When a row is deleted, the `deleteRow` helper on `table.options.meta` automatically cleans up editing state and pending edits before invoking the consumer's `onDeleteRow` callback.

### Quick start

```tsx
const [data, setData] = useState<MyData[]>(initialData);

const handleDeleteRow = (rowId: string) => {
    setData((prev) => prev.filter((row) => row.id !== rowId));
};

<VirtualTable data={data} columns={columns} getRowId={(row) => row.id} onDeleteRow={handleDeleteRow} enableRowSelection>
    <VirtualTable.Toolbar>
        <VirtualTable.GlobalSearch />
        <VirtualTable.DeleteRow />
    </VirtualTable.Toolbar>
    <VirtualTable.Content />
</VirtualTable>;
```

### How it works

1. **Single-row delete:** In an action column cell renderer, call `table.options.meta.deleteRow(row.id)`. This cleans up any editing/pending state for that row and calls the
   consumer's `onDeleteRow` callback.
2. **Bulk delete:** The `<VirtualTable.DeleteRow>` toolbar button reads the current row selection. When clicked, it calls `deleteRow` for each selected row and resets the
   selection. The button shows the selected count (e.g. "Delete (3)") and is disabled when no rows are selected.

### Single-row delete from an action column

```tsx
{
  id: '__actions',
  cell: ({ row, table }) => (
    <button onClick={() => table.options.meta?.deleteRow?.(row.id)}>
      <Trash2 size={14} />
    </button>
  ),
}
```

### Customising the toolbar button

```tsx
{
    /* Custom label */
}
<VirtualTable.DeleteRow label="Remove" />;

{
    /* Custom icon */
}
<VirtualTable.DeleteRow icon={<XCircle size={14} />} label="Remove Selected" />;

{
    /* Custom styling */
}
<VirtualTable.DeleteRow className="bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100" />;
```

### Custom onClick override

Pass an `onClick` prop to fully override the default behavior. When `onClick` is provided, `onDeleteRow` and selection handling are **skipped entirely** — you control the flow
(e.g. show a confirmation dialog first).

```tsx
<VirtualTable.DeleteRow
    label="Delete Selected"
    onClick={() => {
        if (window.confirm('Are you sure?')) {
            selectedIds.forEach((id) => handleDeleteRow(id));
        }
    }}
/>
```

> **Note:** When using `onClick`, the button renders as long as either `onDeleteRow` or `onClick` is provided. It is **not** auto-disabled when no rows are selected — manage that
> in your handler.

---

## Architecture

```
VirtualTable/
  VirtualTable.tsx         Root compound component, state, context provider
  VirtualTableContext.tsx   React context + useVirtualTableContext hook
  types.ts                 All TypeScript interfaces and module augmentation
  index.ts                 Barrel exports
  components/
    AddRow.tsx              Add Row toolbar button (auto-enters edit mode)
    DeleteRow.tsx           Delete Row toolbar button (bulk-deletes selected rows)
    Content.tsx             Virtualised table rendering (headers, filters, rows, expansion)
    EditableCell.tsx         Edit cell dispatcher (routes to type-specific editor)
    ExpanderColumn.tsx      Auto-generated expander column factory
    HeaderCell.tsx          Header cell with sort icons and resize handles
    HighlightedText.tsx     Search-term highlighting
    SelectionCheckbox.tsx   Row selection checkbox column
    Toolbar.tsx             Toolbar wrapper
    GlobalSearch.tsx        Debounced global search input
    ColumnConfigPanel.tsx   Column visibility / order / pinning
    FilterConfig.tsx        Filter row toggle
    SortConfig.tsx          Sort indicator
    RowInfo.tsx             Row count
    SelectedRows.tsx        Selected rows render-prop
    editors/
      editor-styles.ts      Shared styling constants for editors
      InputEditor.tsx        Text / number / date input editor
      BooleanEditor.tsx      Yes / No select editor
      SelectEditor.tsx       Dropdown select editor (sync + async options)
      TagEditor.tsx          Tag chip editor (add/remove tags inline)
    filters/
      ColumnFilter.tsx      Filter dispatcher (routes to type-specific filter)
      TextFilter.tsx        Text input filter
      SelectFilter.tsx      Dropdown select filter (sync + async options)
      NumberRangeFilter.tsx  Min/Max number range filter
      DateRangeFilter.tsx    Calendar date range picker
      BooleanFilter.tsx      Yes/No/All toggle
      TagFilter.tsx          Multi-select tag chip filter
  hooks/
    useAutoColumnSizing.ts  Auto-distributes column widths
    useContainerDimensions.ts  Tracks container size via ResizeObserver
  utils/
    create-action-column.tsx  Action column factory
    filter-fns.ts             Built-in filter implementations
    sort-fns.ts               Built-in sort functions
```

---

## Exports

```ts
// Components
export { VirtualTable }; // Default compound component
export { AddRow }; // Standalone Add Row button
export { DeleteRow }; // Standalone Delete Row button
export { EditableCell }; // Standalone editable cell
export { HighlightedText }; // Search highlight wrapper

// Factories
export { createActionColumn }; // Action column helper
export { ExpanderColumn, EXPANDER_COLUMN_ID };

// Hooks
export { useVirtualTableContext }; // Access table context from compound children
export { useSelectedRows }; // Access selected rows

// Sort functions
export { dateSortFn, dateTimeSortFn, numericSortFn, booleanSortFn, alphanumericInsensitiveSortFn, prioritySortFn };

// Filter functions
export { filterFnMap, tagFilterFn };

// Types
export type {
    AddRowProps,
    DeleteRowProps,
    VirtualTableProps,
    VirtualTableColumnDef,
    VirtualTableClassNames,
    VirtualTableContextValue,
    FilterType,
    EditType,
    FilterOption,
    FilterOptionsArgs,
    EditCellProps,
    CustomFilterComponentProps,
    ColumnMeta,
    RowAction,
    ActionColumnConfig,
    ToolbarProps,
    ContentProps,
    GlobalSearchProps,
    ColumnConfigPanelProps,
    FilterConfigPanelProps,
    SortConfigPanelProps,
    ColumnFilterProps,
    TextFilterProps,
    SelectFilterProps,
    NumberRangeFilterProps,
    DateRangeFilterProps,
    BooleanFilterProps,
    TagFilterProps,
    RowSelectionConfig,
};
```
