# DynamicForm — Runtime (Code-Driven) Forms

Render dynamic forms from a `FormConfig` object built in code. Full control over validation functions, async logic, and callbacks.

---

## Quick Start

```tsx
import { DynamicForm } from '@/shared/modules/dynamic-form';
import type { FormConfig } from '@/shared/modules/dynamic-form';

const config: FormConfig = {
    mode: 'create',
    fields: [
        { name: 'email', type: 'text', label: 'Email', required: true, validation: { pattern: /^[^@]+@[^@]+\.[^@]+$/, patternMessage: 'Invalid email' } },
        {
            name: 'role',
            type: 'select',
            label: 'Role',
            required: true,
            options: [
                { label: 'Admin', value: 'admin' },
                { label: 'User', value: 'user' },
            ],
        },
    ],
    onSubmit: async (values) => {
        await api.post('/users', values);
        return { message: 'User created' };
    },
};

<DynamicForm config={config} />;
```

---

## FormConfig

| Field                  | Type                                         | Description                                                                                  |
| ---------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `fields`               | `FieldConfig[]`                              | Array of field definitions (see below)                                                       |
| `mode`                 | `'create' \| 'update' \| 'delete' \| 'view'` | Form operation mode. `view` disables all fields, `delete` shows confirm-style UI             |
| `onSubmit`             | `(values) => Promise<{ message?: string }>`  | Called on valid submission. Return `{ message }` for success toast                           |
| `onSubmitSuccess?`     | `(values, message) => Promise<void>`         | Called after successful submit (e.g., navigate away, refresh data)                           |
| `onCancel?`            | `() => void \| Promise<void>`                | Called when cancel button is clicked. If not provided, no cancel button is rendered          |
| `onCancelSuccess?`     | `() => void \| Promise<void>`                | Called after `onCancel` completes successfully                                               |
| `initialValues?`       | `Record<string, unknown>`                    | Pre-populate fields (for update/view/delete modes)                                           |
| `submitLabel?`         | `string`                                     | Submit button text (default: `"Submit"` or `"Delete"`)                                       |
| `submittingLabel?`     | `string`                                     | Button text while submitting (default: `"Submitting..."`)                                    |
| `cancelLabel?`         | `string`                                     | Cancel button text (default: `"Cancel"`)                                                     |
| `isFieldDisabled?`     | `(info) => boolean \| undefined`             | Custom per-field disable logic based on mode, field name, current value                      |
| `trackDirty?`          | `boolean`                                    | Track if form has unsaved changes                                                            |
| `submitWithValues?`    | `'changed-only' \| 'all-values'`             | What to send on submit. `'changed-only'` sends only modified fields. Default: `'all-values'` |
| `onDirtyChange?`       | `(isDirty) => void`                          | Fires when dirty state changes                                                               |
| `classNames?`          | `FormClassNames`                             | Override default class names for form layout and field styling (see below)                   |
| `submitGuards?`        | `FormSubmitGuardType[]`                      | Controls which checks run before submission (see [Submit Guards](#submit-guards))            |
| `submitGuardMessages?` | `SubmitGuardMessages`                        | Custom titles, messages, and button labels for submit guard dialogs                          |

### DynamicForm Props

```tsx
<DynamicForm
    config={config}
    formRef={formRef} // expose imperative methods
    isExternalLoading={isFetchingData} // shows loading overlay
    isExternalError={fetchFailed} // shows error overlay
>
    {/* optional children rendered between fields and submit button */}
</DynamicForm>
```

### Imperative Handle (`formRef`)

Expose imperative methods to parent components via `formRef`. Useful for programmatic field updates from external triggers (e.g., AI-generated content, chatbot responses,
cross-field cascading from outside the form).

```tsx
import { useRef } from 'react';
import { DynamicForm } from '@/shared/modules/dynamic-form';
import type { FormImperativeHandle } from '@/shared/modules/dynamic-form';

const formRef = useRef<FormImperativeHandle>(null);

// Programmatic access:
formRef.current?.setFieldValue('close_notes', aiGeneratedNotes);
formRef.current?.getFieldValue('short_description');
formRef.current?.resetField('comments');
formRef.current?.resetForm();
formRef.current?.submitForm();

<DynamicForm config={config} formRef={formRef} />;
```

| Method          | Signature                                 | Description                          |
| --------------- | ----------------------------------------- | ------------------------------------ |
| `setFieldValue` | `(field: string, value: unknown) => void` | Set a field's value programmatically |
| `getFieldValue` | `(field: string) => unknown`              | Read a field's current value         |
| `resetField`    | `(field: string) => void`                 | Reset a field to its default value   |
| `resetForm`     | `() => void`                              | Reset all fields to defaults         |
| `submitForm`    | `() => void`                              | Trigger form submission              |

### FormClassNames

Customise layout and field styling by passing a `classNames` object in config. All keys are optional — classes are merged with defaults via `twMerge`.

| Key            | Applies To                               | Default Classes                                                   |
| -------------- | ---------------------------------------- | ----------------------------------------------------------------- |
| `form`         | Outer `<form>` element                   | `relative flex flex-col h-full w-full`                            |
| `fieldGrid`    | Grid container holding all fields        | `grid grid-cols-2 gap-x-3 gap-y-2 p-4`                            |
| `fieldWrapper` | Wrapper `<div>` around each field        | `col-span-1` or `col-span-2`                                      |
| `label`        | Field label text                         | `text-xs font-medium text-gray-700`                               |
| `error`        | Error message below fields               | `text-[10px] text-red-500 mt-0.5`                                 |
| `submitFooter` | Footer bar with submit button            | `bg-white border-t border-gray-200 px-3 py-2 flex justify-center` |
| `submitButton` | Submit button element                    | `min-w-full text-xs p-1.5 rounded-md font-semibold`               |
| `cancelButton` | Cancel button (when `onCancel` provided) | Same as submitButton with `secondary` variant                     |

```tsx
const config: FormConfig = {
    // ...fields, onSubmit, etc.
    classNames: {
        fieldGrid: 'grid-cols-1 gap-4 p-6', // single column, more spacing
        label: 'text-sm text-blue-800', // larger blue labels
        submitFooter: 'justify-end px-6', // right-aligned submit
    },
};
```

---

## FieldConfig

| Field                    | Type                       | Default  | Description                                                                                                                             |
| ------------------------ | -------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `name`                   | `string`                   | required | Unique field identifier                                                                                                                 |
| `type`                   | `FieldType`                | required | One of: `text`, `textarea`, `password`, `select`, `multiselect`, `number`, `checkbox`, `date`, `datetime`, `date-range`, `number-range` |
| `label`                  | `string`                   | required | Display label. Supports `{field:key}` templates — resolved reactively from form values at render time                                   |
| `placeholder?`           | `string`                   | —        | Placeholder text. Same `{field:key}` template support as label                                                                          |
| `required?`              | `boolean`                  | `false`  | Always required                                                                                                                         |
| `requiredWhen?`          | `FieldDependency`          | —        | Conditionally required (see [Dependencies](#dependencies))                                                                              |
| `defaultValue?`          | `unknown`                  | —        | Fallback value when no initial value provided                                                                                           |
| `disabled?`              | `boolean`                  | `false`  | Always disabled                                                                                                                         |
| `hidden?`                | `boolean`                  | `false`  | Completely excludes the field from the form — not rendered, not registered, not submitted                                               |
| `colSpan?`               | `1 \| 2`                   | `1`      | Grid columns (2 = full width)                                                                                                           |
| `options?`               | `SelectOption[]`           | —        | Static options for select/multiselect                                                                                                   |
| `asyncOptions?`          | `AsyncOptionsConfig`       | —        | Fetch options from API (see [Async Options](#async-options))                                                                            |
| `validation?`            | `FieldValidation`          | —        | Static validation rules (see [Validation](#validation))                                                                                 |
| `conditionalValidation?` | `ConditionalValidation[]`  | —        | Conditional rules, run alongside static (see [Conditional Validation](#conditional-validation))                                         |
| `asyncValidation?`       | `AsyncFieldValidation`     | —        | Debounced async validation (see [Async Validation](#async-validation))                                                                  |
| `visibleWhen?`           | `FieldDependency`          | —        | Show field only when condition is met                                                                                                   |
| `disabledWhen?`          | `FieldDependency`          | —        | Disable field when condition is met                                                                                                     |
| `onChange?`              | `(value, formApi) => void` | —        | Fires on value change. Use `formApi.setFieldValue()` to cascade changes                                                                 |

---

## Validation

Static and conditional validation **both execute together** on every change.

### Static Validation (`validation`)

```ts
validation: {
  minLength: 3,
  minLengthMessage: 'Too short (min 3)',
  maxLength: 100,
  maxLengthMessage: 'Too long (max 100)',
  pattern: /^[a-z0-9-]+$/,
  patternMessage: 'Only lowercase, numbers, hyphens',
  min: 1,
  minMessage: 'Must be at least 1',
  max: 10,
  maxMessage: 'Cannot exceed 10',
  // Date-specific (for date, datetime, date-range fields)
  minDate: '2026-01-01',
  minDateMessage: 'Date must be in 2026 or later',
  maxDate: '2026-12-31',
  maxDateMessage: 'Date must be in 2026',
  minDateField: 'start_date',
  minDateFieldMessage: 'Must be on or after start date',
  maxDateField: 'end_date',
  maxDateFieldMessage: 'Must be on or before end date',
  custom: (value, allValues) => {
    if (value === allValues.otherField) return 'Cannot match other field';
    return undefined;
  },
}
```

| Rule                                   | Applies To                        | Description                                     |
| -------------------------------------- | --------------------------------- | ----------------------------------------------- |
| `min` / `minMessage`                   | number, number-range, multiselect | Minimum numeric value or minimum items selected |
| `max` / `maxMessage`                   | number, number-range, multiselect | Maximum numeric value or maximum items selected |
| `minLength` / `minLengthMessage`       | text, textarea, password          | Minimum string length                           |
| `maxLength` / `maxLengthMessage`       | text, textarea, password          | Maximum string length                           |
| `pattern` / `patternMessage`           | text, textarea, password          | RegExp pattern match                            |
| `minDate` / `minDateMessage`           | date, datetime, date-range        | ISO date string — value must be on or after     |
| `maxDate` / `maxDateMessage`           | date, datetime, date-range        | ISO date string — value must be on or before    |
| `minDateField` / `minDateFieldMessage` | date, datetime, date-range        | Another field whose value is the minimum date   |
| `maxDateField` / `maxDateFieldMessage` | date, datetime, date-range        | Another field whose value is the maximum date   |
| `custom`                               | any                               | Function returning error string or `undefined`  |

### Conditional Validation (`conditionalValidation`)

Rules applied only when a dependency condition is met. Both static and conditional rules execute together — conditional rules **merge onto** static rules (override matching keys).

```ts
// Static: always enforce max 500 chars
validation: { maxLength: 500 },
// Conditional: when priority > 5, also enforce min 30 chars
conditionalValidation: [
  {
    when: { field: 'priority', condition: (val) => val > 5 },
    rules: { minLength: 30, minLengthMessage: 'High priority needs detail' },
  },
],
```

### Async Validation (`asyncValidation`)

Debounced server-side validation. Runs independently of static/conditional.

```ts
asyncValidation: {
  debounceMs: 400,
  validate: async (value) => {
    const res = await api.get('/check-slug', { params: { value } });
    return res.data.taken ? 'Slug already taken' : undefined;
  },
},
```

---

## Dependencies

Control visibility, disabled state, and required state based on other field values.

### Single-Field Dependency

```ts
visibleWhen: {
  field: 'category',
  condition: (value) => value === 'engineering',
}
```

### Multi-Field Dependency

```ts
visibleWhen: {
  fields: ['category', 'region'],
  condition: (allValues) => !!allValues.category && !!allValues.region,
}
```

Works with: `visibleWhen`, `disabledWhen`, `requiredWhen`.

> **Config-based forms:** When forms come from `convertToRuntimeConfig()`, conditions can reference `meta:` and `initialValue:` prefixed fields in addition to form fields. The
> converter resolves these against the `meta` object and initial values at runtime. Meta/initialValue references are static context — they don't trigger re-evaluation. See
> [Form Builder Conditions](../../modules/admin-portal/modules/form-builder/FORM-BUILDER.md#conditions-declarative) for the declarative syntax.

---

## Async Options

Fetch select/multiselect options from an API.

### Using `queryFn` (full control)

```ts
asyncOptions: {
  queryKey: () => ['users'],
  queryFn: async () => {
    const res = await api.get('/users');
    return res.data.map(u => ({ label: u.name, value: String(u.id) }));
  },
}
```

### Using `queryFn` with `dependsOn` (cascading)

```ts
// Subcategories depend on selected category
asyncOptions: {
  queryKey: (depVal) => ['subcategories', depVal],
  queryFn: async (depVal) => {
    const res = await api.get(`/subcategories?category=${depVal}`);
    return res.data;
  },
  dependsOn: 'category',
  debounceMs: 400, // wait 400ms after last change before fetching (default: 300)
}
```

### Multi-field `dependsOn`

```ts
asyncOptions: {
  queryKey: (deps) => ['teams', ...(deps as unknown[])],
  queryFn: async (deps) => {
    const [category, region] = deps as string[];
    return api.get(`/teams?cat=${category}&reg=${region}`).then(r => r.data);
  },
  dependsOn: ['category', 'region'],
}
```

### Using `url` + `mapResponse` (simple)

```ts
asyncOptions: {
  url: '/api/users',
  mapResponse: (data) => {
    const users = data as { id: number; name: string; company: { name: string } }[];
    return users.map(u => ({
      label: `${u.name} (${u.company.name})`,   // combine fields in label
      value: String(u.id),
    }));
  },
}
```

> In code-driven forms, combine fields freely in `mapResponse`. In config-based forms, use template syntax in `labelKey`/`valueKey`, URL path templates with `{key}` tokens, and
> `meta` object for runtime context — see [Form Builder docs](../../modules/admin-portal/modules/form-builder/FORM-BUILDER.md#meta-object).

### Server-Side Search (`optionsAsync`)

For select and multiselect fields that need server-side search (e.g., large datasets from ServiceNow), use the `optionsAsync` prop directly on `SelectInput` or `MultiSelectInput`.
This bypasses `useFieldOptions` and gives you full control over the search API call.

**Behavior:**

1. **On dropdown open** — fetches with empty search term (returns limited results, e.g., first 20)
2. **On user typing** — debounced fetch with search term (server-side filtered results)
3. **Label caching** — previously fetched labels are cached so the selected value displays correctly after dropdown closes

```tsx
import { SelectInput } from '@/shared/components/ui/InputFields';

const searchUsersAsync = useCallback(async (searchTerm: string) => {
    const results = await fetchUsers({ searchTerm }); // appends ?nameLIKE=... &sysparm_limit=20
    return results.map((u) => ({ label: u.name, value: u.sys_id }));
}, []);

<SelectInput value={value} onChange={onChange} optionsAsync={searchUsersAsync} optionsAsyncDebounce={400} placeholder="Search users..." />;
```

**Service function pattern** — append search params only when a search term is provided:

```ts
export const fetchUsers = async ({ searchTerm }: { searchTerm?: string } = {}) => {
    let url = appConfig.api.users; // base URL with existing query params
    if (searchTerm) {
        url += `&sysparm_limit=20&sysparm_query=nameLIKE${encodeURIComponent(searchTerm)}`;
    }
    const response = await apiClient.get(url);
    return response.data.result;
};
```

### Server-Side Search in DynamicForm (`searchable`)

For DynamicForm fields (code-driven or config-based), add `searchable: true` to `asyncOptions`. This switches the field from pre-fetched static options to server-side search via
the `optionsAsync` prop on SelectInput/MultiSelectInput.

**Behavior:**

1. **On dropdown open** — fetches with empty search term (returns limited results)
2. **On user typing** — debounced fetch with search term passed to `queryFn` as the second argument
3. **Label caching** — previously fetched labels persist after dropdown closes

```ts
{
    name: 'assignment_group',
    type: 'select',
    label: 'Assignment Group',
    asyncOptions: {
        queryKey: () => ['assignment-groups'],
        queryFn: async (_depVal, searchTerm) => {
            const results = await fetchGroups({ searchTerm });
            return results.map(g => ({ label: g.name, value: g.sys_id }));
        },
        searchable: true,
        searchDebounceMs: 400,
    },
}
```

| Field              | Type      | Default | Description                                                     |
| ------------------ | --------- | ------- | --------------------------------------------------------------- |
| `searchable`       | `boolean` | `false` | Enable server-side search instead of pre-fetched static options |
| `searchDebounceMs` | `number`  | `300`   | Debounce delay for search term changes                          |

> **Note:** When using `searchable` with `url` (no `queryFn`), the search term is automatically appended as `&sysparm_query=nameLIKE{searchTerm}` to the URL.

> For direct component-level use (outside DynamicForm), use the `optionsAsync` prop on `SelectInput`/`MultiSelectInput` instead.

---

## Cascading Field Changes (`onChange`)

Reset dependent fields when a parent field changes. Use the `formApi` parameter (the TanStack Form instance) for field-to-field cascading within the form:

```ts
{
  name: 'category',
  type: 'select',
  onChange: (_value, formApi) => {
    const api = formApi as { setFieldValue: (name: string, value: unknown) => void };
    api.setFieldValue('subCategory', '');
    api.setFieldValue('team', '');
  },
}
```

For external triggers (AI responses, chatbot integration), use `formRef` instead — see [Imperative Handle](#imperative-handle-formref).

---

## Form Modes

| Mode     | Behavior                                              |
| -------- | ----------------------------------------------------- |
| `create` | Empty form, all fields editable                       |
| `update` | Pre-populated from `initialValues`, fields editable   |
| `delete` | Pre-populated, fields read-only, confirm-style submit |
| `view`   | Pre-populated, all fields disabled, no submit button  |

```tsx
const config: FormConfig = {
  mode: 'update',
  initialValues: { name: 'Existing', email: 'user@co.com' },
  fields: [...],
  onSubmit: async (values) => {
    await api.put('/items/123', values);
    return { message: 'Updated' };
  },
};
```

---

## Field Combination in Mapping

Combine multiple fields into one when mapping values.

### On Submit (outbound)

Form fields `first_name` + `last_name` combined into API body key `fullName`:

```ts
// In runtime code:
const combined = { ...formValues };
combined.fullName = `${combined.first_name} ${combined.last_name}`;
delete combined.first_name;
delete combined.last_name;
```

### On Initial Values (inbound)

API response fields `firstName` + `lastName` combined into form field `displayName`:

```ts
const combined = { ...apiData };
combined.displayName = `${combined.firstName} ${combined.lastName}`;
delete combined.firstName;
delete combined.lastName;
```

> For config-based forms, use template syntax in mapping values (`"fullName": "{first_name} {last_name}"`) or `fieldCombinations` for advanced control — see
> [Mapping Templates](../../modules/admin-portal/modules/form-builder/FORM-BUILDER.md#mapping-templates).

---

## Submit Guards

Control which checks run before form submission and customise dialog messages.

### Default Guards

Each form mode has sensible defaults:

| Mode     | Default Guards                        |
| -------- | ------------------------------------- |
| `create` | `confirm-before-submit`               |
| `update` | `no-changes`, `confirm-before-submit` |
| `delete` | `confirm-before-submit`               |
| `view`   | _(none)_                              |

### Available Guard Types

| Guard                   | Behavior                                                           |
| ----------------------- | ------------------------------------------------------------------ |
| `no-changes`            | Blocks submit and shows a dialog when no fields have been modified |
| `confirm-before-submit` | Shows a confirmation dialog before executing the submit            |

### Overriding Guards

Pass `submitGuards` to replace the defaults entirely:

```tsx
const config: FormConfig = {
    mode: 'update',
    fields: [...],
    onSubmit: async (values) => { /* ... */ },
    // Skip the no-changes check, only confirm
    submitGuards: ['confirm-before-submit'],
};
```

Pass an empty array to disable all guards:

```tsx
submitGuards: [], // submit immediately, no dialogs
```

### Custom Guard Messages

Customise dialog titles, messages, and button labels with `submitGuardMessages`:

```tsx
const config: FormConfig = {
    mode: 'update',
    fields: [...],
    onSubmit: async (values) => { /* ... */ },
    submitGuards: ['no-changes', 'confirm-before-submit'],
    submitGuardMessages: {
        // "No Changes" dialog
        noChangesTitle: 'No modifications',
        noChangesMessage: 'Edit some fields before saving.',
        // "Confirm" dialog
        confirmTitle: 'Save changes?',
        confirmMessage: 'You are about to save your changes. Continue?',
        confirmProceedLabel: 'Save',
        confirmDiscardLabel: 'Cancel',
    },
};
```

| Field                 | Dialog           | Default                 |
| --------------------- | ---------------- | ----------------------- |
| `noChangesTitle`      | No Changes       | `"No Changes Detected"` |
| `noChangesMessage`    | No Changes       | _(generic message)_     |
| `confirmTitle`        | Confirm          | `"Confirm Submission"`  |
| `confirmMessage`      | Confirm          | _(generic message)_     |
| `confirmProceedLabel` | Confirm (button) | `"Submit"`              |
| `confirmDiscardLabel` | Confirm (button) | `"Cancel"`              |

> For config-based forms, submit guards and custom messages are configured in the Form Builder UI — see
> [Form Builder docs](../../modules/admin-portal/modules/form-builder/FORM-BUILDER.md#submit-guards).

---

## Complete Example

See [`__tests__/DynamicFormExample.tsx`](__tests__/DynamicFormExample.tsx) for a full working example with all features:

- All 10 field types
- Static + conditional validation (running together)
- Async validation (slug uniqueness)
- Async options (queryFn, url+mapResponse, single/multi dependsOn)
- requiredWhen, visibleWhen, disabledWhen (single + multi-field)
- Field exclusion (hidden), defaultValue
- onChange cascading
- Field combinations (inbound + outbound)
- Form modes with initial values
- Body mapping and field mapping

---

## Architecture

```
DynamicForm
  +-- uses TanStack React Form (v1.29+)
  +-- uses buildZodSchema() for form-level Zod validation
  +-- renders DynamicField for each FieldConfig
        +-- uses buildFieldValidator() for field-level sync validation
        +-- uses useFieldOptions() for async options (React Query)
        +-- resolves visibleWhen / disabledWhen / requiredWhen
        +-- merges static + conditional validation
        +-- renders one of 11 field components
```
