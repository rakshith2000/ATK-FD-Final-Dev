# Form Builder — Config-Based (Serializable) Forms

Build forms from JSON configuration stored in a database. No JavaScript functions — all logic uses declarative operators. At runtime, the config is converted to a `FormConfig` that
`DynamicForm` renders.

> For runtime (code-driven) forms, see [DynamicForm docs](../../../shared/modules/dynamic-form/DYNAMIC-FORM.md).

---

## How It Works

```
DB (JSON) ──> FormConfigRecord ──> convertToRuntimeConfig() ──> FormConfig ──> <DynamicForm />
```

1. Store form definitions as `FormConfigRecord` in your database (JSON-safe, no functions)
2. Call `convertToRuntimeConfig(record, options?)` to get a runtime `FormConfig`
3. Pass the `FormConfig` to `<DynamicForm config={config} />`

---

## Quick Start

```tsx
import { DynamicForm } from '@/shared/modules/dynamic-form';
import { convertToRuntimeConfig, fetchInitialValues } from '../utils/convert-to-runtime-config';
import { fetchFormConfigById } from '../services/form-config-api';
import { useQueryClient } from '@tanstack/react-query';

function MyForm({ formId, ticketId }: { formId: string; ticketId: string }) {
    const queryClient = useQueryClient();
    const [config, setConfig] = useState<FormConfig | null>(null);

    useEffect(() => {
        async function load() {
            const record = await fetchFormConfigById(formId);

            // meta = flat object with runtime context (e.g. ticket data, record IDs)
            const meta = { ticketId, tenantId: 'acme' };

            // Fetch initial values — caller fetches, converter applies fieldMapping if configured
            // Use fetchInitialValues for mapped flat values, or fetchRawInitialValues if you
            // also need the raw API response for code-driven behavior (see Hybrid Approach)
            const initialValues = await fetchInitialValues(record, meta);

            const runtimeConfig = convertToRuntimeConfig(record, {
                queryClient,
                initialValues, // converter applies fieldMapping automatically if configured
                meta, // flows to all async options for URL template resolution
            });
            setConfig(runtimeConfig);
        }
        load();
    }, [formId, ticketId]);

    if (!config) return <div>Loading...</div>;
    return <DynamicForm config={config} />;
}
```

---

## FormConfigRecord (DB Entity)

The top-level JSON object stored in your database.

| Field                  | Type                                         | Description                                                                                                                                           |
| ---------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                   | `string`                                     | Unique identifier                                                                                                                                     |
| `code`                 | `string`                                     | Machine-readable code for lookup (e.g., "onboard-service", "update-ticket")                                                                           |
| `name`                 | `string`                                     | Form name (e.g., "Onboard Service")                                                                                                                   |
| `description?`         | `string`                                     | Human-readable description                                                                                                                            |
| `mode?`                | `'create' \| 'update' \| 'delete' \| 'view'` | Default form mode                                                                                                                                     |
| `submitLabel?`         | `string`                                     | Custom submit button text (default: "Submit" or "Delete")                                                                                             |
| `submittingLabel?`     | `string`                                     | Button text while submitting (default: "Submitting...")                                                                                               |
| `cancelLabel?`         | `string`                                     | Cancel button text (default: "Cancel"). Only rendered when `onCancel` is provided at runtime                                                          |
| `trackDirty?`          | `boolean`                                    | Track if form has unsaved changes                                                                                                                     |
| `submitWithValues?`    | `'changed-only' \| 'all-values'`             | What to send on submit. `'changed-only'` sends only modified fields. Default: `'changed-only'`                                                        |
| `variant?`             | `'standard' \| 'outlined' \| 'filled'`       | Input field variant. `standard`: label above. `outlined`: floating label with border. `filled`: floating label with background. Default: `'standard'` |
| `fields`               | `SerializableFieldConfig[]`                  | Field definitions (see below)                                                                                                                         |
| `submitConfig?`        | `SerializableSubmitConfig`                   | API submission settings                                                                                                                               |
| `initialValuesConfig?` | `SerializableInitialValuesConfig`            | How to fetch initial values                                                                                                                           |
| `metaFields?`          | `MetaFieldDefinition[]`                      | Describes the expected `meta` object shape (see [Meta Object](#meta-object))                                                                          |
| `submitGuards?`        | `FormSubmitGuardType[]`                      | Which checks run before submission: `'no-changes'`, `'confirm-before-submit'`. See [Submit Guards](#submit-guards)                                    |
| `submitGuardMessages?` | `SubmitGuardMessages`                        | Custom titles, messages, and button labels for submit guard dialogs. See [Submit Guards](#submit-guards)                                              |

---

## Variant & ClassNames (Code-Based)

### Variant

The `variant` prop controls the visual style of all input fields. Set on `FormConfigRecord` (DB-stored) or via `convertToRuntimeConfig` / `DynamicFormRenderer` (code-based).

| Variant    | Label Behavior                      | Border                                      |
| ---------- | ----------------------------------- | ------------------------------------------- |
| `standard` | Static label above input (default)  | Input has its own border                    |
| `outlined` | Floating label inside a border      | Outer fieldset border, input border removed |
| `filled`   | Floating label on filled background | Bottom border only, filled background       |

```tsx
// Config-based (DB)
const record: FormConfigRecord = { ...record, variant: 'outlined' };

// Code-based
<DynamicFormRenderer fields={fields} formName="My Form" variant="outlined" />;

// Runtime override
convertToRuntimeConfig(record, { variant: 'filled' });
```

### ClassNames

Override default Tailwind classes for form layout and field styling via the `classNames` prop on `DynamicFormRenderer` or `convertToRuntimeConfig`. All keys are optional — merged
with defaults via `twMerge` at runtime. This is code-only (not stored in DB).

```tsx
<DynamicFormRenderer
    fields={form.fields}
    formName={form.name}
    variant="outlined"
    classNames={{
        fieldGrid: 'grid-cols-1 gap-4 p-6',
        label: 'text-sm text-blue-800',
        input: 'text-sm py-2',
        textarea: 'min-h-24',
        selectTrigger: 'py-2 text-sm',
        fieldset: 'rounded-lg',
        chip: 'bg-blue-100 text-blue-800',
        submitButton: 'min-w-40',
    }}
/>
```

#### Layout

| Key            | Applies To                        | Default Classes                                                   |
| -------------- | --------------------------------- | ----------------------------------------------------------------- |
| `form`         | Outer `<form>` element            | `relative flex flex-col h-full w-full`                            |
| `fieldGrid`    | Grid container holding all fields | `grid grid-cols-2 gap-x-3 gap-y-2 p-4`                            |
| `fieldWrapper` | Wrapper `<div>` around each field | `col-span-1` or `col-span-2`                                      |
| `submitFooter` | Footer bar with submit button     | `bg-white border-t border-gray-200 px-3 py-2 flex justify-center` |
| `submitButton` | Submit button element             | `min-w-full text-xs p-1.5 rounded-md font-semibold`               |

#### Field Label & Error

| Key        | Applies To                                     | Default Classes                                 |
| ---------- | ---------------------------------------------- | ----------------------------------------------- |
| `label`    | Field label text                               | `text-xs font-medium text-gray-700`             |
| `error`    | Error message below fields                     | `text-[10px] text-red-500 mt-0.5`               |
| `fieldset` | Border wrapper (outlined/filled variants only) | Variant-specific border with focus/error states |

#### Input Elements

| Key        | Applies To                                   | Notes                                                                 |
| ---------- | -------------------------------------------- | --------------------------------------------------------------------- |
| `input`    | Text, number, password `<input>` elements    | Merged with variant's `inputClassName` (e.g. `border-0` for outlined) |
| `textarea` | `<textarea>` element (multiline text fields) | Overrides `input` for textarea specifically                           |

#### Select, Multi-Select & Date Pickers

| Key             | Applies To                                           | Notes                           |
| --------------- | ---------------------------------------------------- | ------------------------------- |
| `selectTrigger` | Trigger button for select, multiselect, date pickers | The clickable dropdown button   |
| `chip`          | Multi-select chip elements                           | Individual selected value chips |
| `chipDelete`    | Chip delete `×` icon                                 | Inside each chip                |

#### Checkbox

| Key             | Applies To                       | Notes                       |
| --------------- | -------------------------------- | --------------------------- |
| `checkboxInput` | Checkbox `<input>` element       | The checkbox control itself |
| `checkboxLabel` | Checkbox label `<label>` wrapper | Wraps checkbox + label text |

---

## SerializableFieldConfig

Each field in the form. All logic is declarative — no JS functions.

| Field                    | Type                                  | Default  | Description                                                                                                                     |
| ------------------------ | ------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `name`                   | `string`                              | required | Unique field identifier                                                                                                         |
| `type`                   | `FieldType`                           | required | `text`, `textarea`, `password`, `select`, `multiselect`, `number`, `checkbox`, `date`, `datetime`, `date-range`, `number-range` |
| `label`                  | `string`                              | required | Display label. Supports prefixed templates: `{meta:key}`, `{field:key}` (reactive), `{initialValue:key}`                        |
| `placeholder?`           | `string`                              | —        | Placeholder text. Supports prefixed templates: `{meta:key}`, `{field:key}` (reactive), `{initialValue:key}`                     |
| `required?`              | `boolean`                             | `false`  | Always required                                                                                                                 |
| `requiredWhen?`          | `Condition`                           | —        | Required when condition is met                                                                                                  |
| `defaultValue?`          | `unknown`                             | —        | Fallback value. String values support prefixed templates: `{meta:currentUser}`, `{initialValue:key}`                            |
| `disabled?`              | `boolean`                             | `false`  | Always disabled                                                                                                                 |
| `hidden?`                | `boolean`                             | `false`  | Excludes field entirely — not rendered, registered, or submitted                                                                |
| `colSpan?`               | `1 \| 2`                              | `1`      | Grid columns (2 = full width)                                                                                                   |
| `options?`               | `SelectOption[]`                      | —        | Static options for select/multiselect                                                                                           |
| `asyncOptions?`          | `SerializableAsyncOptions`            | —        | Fetch options from API                                                                                                          |
| `validation?`            | `SerializableValidation`              | —        | Static validation rules                                                                                                         |
| `conditionalValidation?` | `SerializableConditionalValidation[]` | —        | Conditional rules (run alongside static)                                                                                        |
| `asyncValidation?`       | `SerializableAsyncValidation`         | —        | Async validation endpoint                                                                                                       |
| `visibleWhen?`           | `Condition`                           | —        | Show only when condition met                                                                                                    |
| `disabledWhen?`          | `Condition`                           | —        | Disable when condition met                                                                                                      |
| `onChangeEffects?`       | `SerializableOnChangeEffect[]`        | —        | Declarative field updates triggered when this field's value changes (see [onChange Effects](#onchange-effects))                 |

---

## Conditions (Declarative)

Replace JavaScript functions with operator-based conditions.

### Single-Field Condition

```json
{
    "field": "environment",
    "operator": "equals",
    "value": "prod"
}
```

### Prefixed Conditions

Conditions support **prefixed field references** and **prefixed value templates** to access different data sources. The Form Builder UI exposes this via a **Source** dropdown on
each condition row — select "Form Field", "Meta", or "Initial Value" to choose the data source. When "Meta" or "Initial Value" is selected, a text input replaces the field dropdown
so you can enter the key name directly.

**`field` supports three sources:**

- `"fieldName"` — reads from form field values (default, UI: Source = "Form Field")
- `"meta:keyName"` — reads from the meta object (UI: Source = "Meta")
- `"initialValue:keyName"` — reads from initial values response (UI: Source = "Initial Value")

**`value` supports prefixed `{source:key}` templates:**

- `"incident"` — static literal (no braces)
- `"{meta:expectedType}"` — resolved from meta
- `"{field:category}"` — resolved from current form field values (reactive)
- `"{initialValue:original_status}"` — resolved from initial values

```json
// Form field equals a meta value
{ "field": "type", "operator": "equals", "value": "{meta:expectedType}" }

// Meta value equals a static value
{ "field": "meta:ticketType", "operator": "equals", "value": "incident" }

// Form field equals another form field value
{ "field": "password", "operator": "equals", "value": "{field:confirmPassword}" }

// Meta value compared to initial value
{ "field": "meta:env", "operator": "not_equals", "value": "{initialValue:original_env}" }

// In operator — matches any of the given values (replaces multi-condition OR with equals)
{ "field": "state", "operator": "in", "value": ["6", "7", "157"] }

// Not in — excludes specific values
{ "field": "category", "operator": "not_in", "value": ["archived", "deleted"] }

// Contains — string substring or array item check
{ "field": "tags", "operator": "contains", "value": "urgent" }
```

### Multi-Field Condition (AND/OR)

```json
{
    "join": "and",
    "conditions": [
        { "field": "environment", "operator": "equals", "value": "prod" },
        { "field": "meta:featureFlag", "operator": "equals", "value": true },
        { "field": "priority", "operator": "equals", "value": "{field:urgency}" }
    ]
}
```

> **Note:** `meta:` and `initialValue:` fields are static context — they don't trigger re-evaluation when form values change. Only bare form field references trigger dependency
> tracking.

### Available Operators

| Operator     | Description                                       | Needs `value` | Value Type       |
| ------------ | ------------------------------------------------- | ------------- | ---------------- |
| `equals`     | Strict equality (`===`)                           | Yes           | any              |
| `not_equals` | Strict inequality (`!==`)                         | Yes           | any              |
| `not_empty`  | Not undefined, null, `""`, or empty array         | No            | —                |
| `empty`      | Is undefined, null, `""`, or empty array          | No            | —                |
| `contains`   | String includes substring, or array includes item | Yes           | string           |
| `in`         | Field value is one of the given values            | Yes           | `string[]`       |
| `not_in`     | Field value is NOT one of the given values        | Yes           | `string[]`       |
| `gt`         | Greater than (numbers and date/datetime strings)  | Yes           | number or string |
| `lt`         | Less than (numbers and date/datetime strings)     | Yes           | number or string |
| `gte`        | Greater than or equal (numbers and date/datetime) | Yes           | number or string |
| `lte`        | Less than or equal (numbers and date/datetime)    | Yes           | number or string |

### Where Conditions Are Used

- `visibleWhen` — show field when condition is true
- `disabledWhen` — disable field when condition is true
- `requiredWhen` — require field when condition is true
- `conditionalValidation[].when` — apply extra rules when condition is true
- `onChangeEffects[].when` — fire the effect only when condition is true

> **UI support:** All condition locations above support the Source dropdown (Form Field / Meta / Initial Value) and `{prefix:key}` template syntax in the compare value. Meta and
> initial value references in conditions are automatically detected and shown in the **Template Contract** panel.

#### UI Examples

**Show field only in production** (Source = Meta):

1. Click "+ Add" next to `visibleWhen`
2. Set **Source** = `Meta`, **Field** = `environment`
3. Set **Operator** = `Equals`, **Value** = `prod`

Stored JSON: `{ "field": "meta:environment", "operator": "equals", "value": "prod" }`

**Disable field when initial status was archived** (Source = Initial Value):

1. Click "+ Add" next to `disabledWhen`
2. Set **Source** = `Initial Value`, **Field** = `status`
3. Set **Operator** = `Equals`, **Value** = `archived`

Stored JSON: `{ "field": "initialValue:status", "operator": "equals", "value": "archived" }`

**Compare form field against meta value** (template in Value):

1. Set **Source** = `Form Field`, **Field** = `type`
2. Set **Operator** = `Equals`, **Value** = `{meta:expectedType}`

Stored JSON: `{ "field": "type", "operator": "equals", "value": "{meta:expectedType}" }`

---

## Validation

Static and conditional validation **both execute together**.

### Static Validation

```json
{
    "name": "email",
    "type": "text",
    "label": "Email",
    "validation": {
        "pattern": "^[^@]+@[^@]+\\.[^@]+$",
        "patternMessage": "Enter a valid email address",
        "minLength": 5,
        "minLengthMessage": "Email is too short",
        "maxLength": 100
    }
}
```

| Rule                                   | Type                | Applies To                        | Description                                     |
| -------------------------------------- | ------------------- | --------------------------------- | ----------------------------------------------- |
| `min` / `minMessage`                   | `number` / `string` | number, number-range, multiselect | Minimum numeric value or minimum items selected |
| `max` / `maxMessage`                   | `number` / `string` | number, number-range, multiselect | Maximum numeric value or maximum items selected |
| `minLength` / `minLengthMessage`       | `number` / `string` | text, textarea, password          | Minimum string length                           |
| `maxLength` / `maxLengthMessage`       | `number` / `string` | text, textarea, password          | Maximum string length                           |
| `pattern` / `patternMessage`           | `string` / `string` | text, textarea, password          | Regex pattern (as string, e.g., `"^[a-z]+$"`)   |
| `minDate` / `minDateMessage`           | `string` / `string` | date, datetime, date-range        | ISO date string — value must be on or after     |
| `maxDate` / `maxDateMessage`           | `string` / `string` | date, datetime, date-range        | ISO date string — value must be on or before    |
| `minDateField` / `minDateFieldMessage` | `string` / `string` | date, datetime, date-range        | Another field whose value is the minimum date   |
| `maxDateField` / `maxDateFieldMessage` | `string` / `string` | date, datetime, date-range        | Another field whose value is the maximum date   |

> Every rule supports a custom error message. If omitted, a default message is used.
>
> **Checkbox** fields have no static or conditional validation — use the `required` toggle to enforce that the checkbox must be checked.

### Conditional Validation

Extra rules applied when a condition is met. Merges onto static rules.

```json
{
    "name": "description",
    "type": "textarea",
    "validation": {
        "maxLength": 500
    },
    "conditionalValidation": [
        {
            "when": { "field": "severity", "operator": "equals", "value": "p1" },
            "rules": {
                "minLength": 100,
                "minLengthMessage": "P1 incidents need detailed description (100+ chars)"
            }
        }
    ]
}
```

When `severity` = `"p1"`:

- `maxLength: 500` (static) **AND** `minLength: 100` (conditional) both apply

### Async Validation

Server-side validation via API endpoint.

```json
{
    "name": "service_name",
    "asyncValidation": {
        "url": "/api/services/check-name",
        "method": "GET",
        "errorPath": "error",
        "debounceMs": 400
    }
}
```

| Field         | Type              | Default  | Description                                                               |
| ------------- | ----------------- | -------- | ------------------------------------------------------------------------- |
| `url`         | `string`          | required | API endpoint. Value sent as `?value=...` (GET) or `{ value }` (POST)      |
| `method?`     | `'GET' \| 'POST'` | `GET`    | HTTP method                                                               |
| `errorPath?`  | `string`          | —        | Dot-path to error message in response (e.g., `"error"`, `"data.message"`) |
| `debounceMs?` | `number`          | `500`    | Debounce delay in milliseconds                                            |

---

## onChange Effects

Declarative field updates triggered when a field's value changes. Replaces code-driven `field.onChange = (v) => formApi.setFieldValue(...)` with JSON config.

### SerializableOnChangeEffect

| Field      | Type        | Default  | Description                                                                    |
| ---------- | ----------- | -------- | ------------------------------------------------------------------------------ |
| `setField` | `string`    | required | Target field name to update                                                    |
| `setValue` | `unknown`   | required | Value to set. Supports `{field:key}` templates. Use `""` to clear.             |
| `when?`    | `Condition` | —        | Optional condition — effect only fires when met. Omit = always fire on change. |

### Examples

**Clear dependent field when parent changes** (always fires):

```json
{
    "name": "assignment_group",
    "type": "select",
    "onChangeEffects": [{ "setField": "assigned_to", "setValue": "" }]
}
```

**Set field value conditionally** (only when state is Resolved/Closed):

```json
{
    "name": "state",
    "type": "select",
    "onChangeEffects": [
        {
            "setField": "close_code",
            "setValue": "Solved (Permanently)",
            "when": { "field": "state", "operator": "in", "value": ["6", "7", "157"] }
        }
    ]
}
```

**Auto-set checkbox when environment is production**:

```json
{
    "name": "environment",
    "type": "select",
    "onChangeEffects": [
        {
            "setField": "is_critical",
            "setValue": true,
            "when": { "field": "environment", "operator": "equals", "value": "prod" }
        }
    ]
}
```

**Template value** — copy one field's value to another:

```json
{
    "name": "billing_email",
    "onChangeEffects": [
        {
            "setField": "contact_email",
            "setValue": "{field:billing_email}"
        }
    ]
}
```

### How It Works at Runtime

1. The converter reads `onChangeEffects` and generates a runtime `onChange` handler
2. When the field value changes, each effect is evaluated:
    - If `when` condition exists and is `false` -> skip
    - Otherwise -> `formApi.setFieldValue(setField, resolvedValue)`
3. `{field:key}` templates in `setValue` resolve from current form values (after the new value is applied)
4. Multiple effects per field are supported — evaluated in order

### Code-Driven vs Config-Driven

For **simple patterns** (clear field, set value, conditional set), use `onChangeEffects` in config.

For **complex logic** (priority matrix, external callbacks, multi-step cascades), use code-driven `onChange`:

```tsx
// Code-driven: complex priority matrix that can't be expressed declaratively
const config = convertToRuntimeConfig(record, { queryClient, meta });
const urgencyField = config.fields.find((f) => f.name === 'urgency');
if (urgencyField) {
    urgencyField.onChange = (value, formApi) => {
        const impact = formApi.getFieldValue('impact');
        formApi.setFieldValue('priority', getPriorityFromMatrix(value, impact));
    };
}
```

**Wrapping pattern** — when a field has both `onChangeEffects` AND needs extra code-driven logic (e.g. an external callback), save the config-generated handler and call it:

```tsx
// Config already has: onChangeEffects: [{ setField: 'close_code', setValue: '...', when: ... }]
const stateField = config.fields.find((f) => f.name === 'state');
if (stateField) {
    const configOnChange = stateField.onChange; // Generated from onChangeEffects
    stateField.onChange = (value, formApi) => {
        configOnChange?.(value, formApi); // Run config-driven effects
        onTicketStateChange?.(value as string); // Extra code-driven logic
    };
}
```

> **Note:** If both `onChangeEffects` (from config) and a code-driven `onChange` are set, the code-driven handler **overwrites** the config-generated one. To combine them, save the
> config-generated handler first and call it from your code handler.

---

## Submit Guards

Control which checks run before form submission and customise the dialog messages. Stored on `FormConfigRecord` and passed through to `DynamicForm` at runtime via
`convertToRuntimeConfig`.

### Guard Types

| Guard                   | Behavior                                                      |
| ----------------------- | ------------------------------------------------------------- |
| `no-changes`            | Blocks submit when no fields have been modified (update mode) |
| `confirm-before-submit` | Shows a confirmation dialog before executing the submit       |

### Config Example

```json
{
    "submitGuards": ["no-changes", "confirm-before-submit"],
    "submitGuardMessages": {
        "noChangesTitle": "No modifications",
        "noChangesMessage": "Edit some fields before saving.",
        "confirmTitle": "Save changes?",
        "confirmMessage": "You are about to save your changes. Continue?",
        "confirmProceedLabel": "Save",
        "confirmDiscardLabel": "Cancel"
    }
}
```

### SubmitGuardMessages

| Field                 | Dialog           | Default                 |
| --------------------- | ---------------- | ----------------------- |
| `noChangesTitle`      | No Changes       | `"No Changes Detected"` |
| `noChangesMessage`    | No Changes       | _(generic message)_     |
| `confirmTitle`        | Confirm          | `"Confirm Submission"`  |
| `confirmMessage`      | Confirm          | _(generic message)_     |
| `confirmProceedLabel` | Confirm (button) | `"Submit"`              |
| `confirmDiscardLabel` | Confirm (button) | `"Cancel"`              |

### Form Builder UI

The editor exposes submit guards via:

1. **Checkboxes** — toggle "No Changes Warning" and "Confirm Before Submit" individually
2. **Custom Messages** — expandable details section with text inputs for each message field

When no guards are checked, `submitGuards` is omitted from the saved config and `DynamicForm` falls back to its per-mode defaults (see
[DynamicForm Submit Guards](../../../shared/modules/dynamic-form/DYNAMIC-FORM.md#submit-guards)).

> For code-driven forms, see [DynamicForm Submit Guards](../../../shared/modules/dynamic-form/DYNAMIC-FORM.md#submit-guards).

---

## Async Options

Fetch select/multiselect options from an API endpoint.

### Basic

```json
{
    "name": "owner",
    "type": "select",
    "asyncOptions": {
        "url": "/api/users",
        "labelKey": "{response:name}",
        "valueKey": "{response:id}"
    }
}
```

API returns: `[{ "id": 1, "name": "John" }, ...]` Options become: `[{ label: "John", value: "1" }, ...]`

### With Nested Response

```json
{
    "asyncOptions": {
        "url": "/api/data",
        "responsePath": "data.results",
        "labelKey": "{response:company.name}",
        "valueKey": "{response:address.city}"
    }
}
```

API returns: `{ "data": { "results": [{ "company": { "name": "Acme" }, "address": { "city": "NYC" } }] } }` Options become: `[{ label: "Acme", value: "NYC" }]`

### Combining Multiple Fields (template)

Use multiple `{response:fieldName}` placeholders in `labelKey` or `valueKey` to combine fields from each response item into a single label or value.

```json
{
    "asyncOptions": {
        "url": "/api/users",
        "labelKey": "{response:name} ({response:company.name})",
        "valueKey": "{response:id}"
    }
}
```

API returns: `[{ "id": 1, "name": "John", "company": { "name": "Acme" } }, ...]` Options become: `[{ label: "John (Acme)", value: "1" }, ...]`

Dot-paths work inside templates: `"{response:address.city}, {response:address.state}"` -> `"NYC, NY"`

> `labelKey` and `valueKey` use `{response:...}` syntax:
>
> - **Single field**: e.g. `"{response:name}"` or `"{response:company.name}"` — extract a single field from response
> - **Combining fields**: e.g. `"{response:field1} {response:field2}"` — combine multiple response fields
> - **Static** (no braces): e.g. `"name"` — returned as a literal string, NOT resolved from the response

### With Dependencies (Cascading)

```json
{
    "name": "subcategory",
    "type": "select",
    "asyncOptions": {
        "url": "/api/subcategories",
        "method": "GET",
        "labelKey": "{response:name}",
        "valueKey": "{response:id}",
        "dependsOn": "category"
    }
}
```

When `category` changes, refetches from `/api/subcategories?category=engineering`.

### Multiple Dependencies

```json
{
    "asyncOptions": {
        "url": "/api/teams",
        "dependsOn": ["category", "region"],
        "labelKey": "{response:name}",
        "valueKey": "{response:id}"
    }
}
```

GET: `/api/teams?category=engineering&region=us-east` — dependency field values are sent using their original field names.

### POST Method (JSON Body)

```json
{
    "asyncOptions": {
        "url": "/api/search-options",
        "method": "POST",
        "dependsOn": ["category", "region"],
        "responsePath": "data",
        "labelKey": "{response:name}",
        "valueKey": "{response:code}"
    }
}
```

POST body: `{ "category": "engineering", "region": "us-east" }`

### How `dependsOn` Works

1. **`dependsOn`** decides WHICH fields to watch. Only these field values are sent to the API using their original field names.
2. When any `dependsOn` field changes, options are refetched with the new values.
3. **Default behavior** (no `requestParams`): For GET, values are appended as query params (`?category=eng`). For POST, values are sent as JSON body.
4. **With `requestParams.queryParams`**: If a `{field:key}` template references a dependency field inside a query param value, that field is **consumed** by the template and NOT
   duplicated as a separate param.

### Dependency Values — Two Approaches

**Approach 1: Automatic** — dependency values are appended as separate query params using their field name:

```json
{
    "asyncOptions": {
        "url": "/api/subcategories",
        "dependsOn": "category"
    }
}
```

Result: `GET /api/subcategories?category=engineering`

**Approach 2: Embedded in `requestParams.queryParams`** — use `{field:key}` to embed the dependency value inside a larger query param. The consumed field is NOT duplicated as a
separate param:

```json
{
    "asyncOptions": {
        "url": "/api/now/table/sys_user_grmember",
        "dependsOn": "assignment_group",
        "requestParams": {
            "queryParams": {
                "sysparm_display_value": "all",
                "sysparm_fields": "user,sys_id",
                "sysparm_query": "group={field:assignment_group}"
            }
        }
    }
}
```

Result: `GET /api/now/table/sys_user_grmember?sysparm_display_value=all&sysparm_fields=user,sys_id&sysparm_query=group=abc123`

Here `assignment_group` is consumed by `{field:assignment_group}` inside `sysparm_query`, so it's not appended again as `&assignment_group=abc123`.

**Approach 2 also works in URLs** — `{field:key}` in the URL path consumes the dependency value:

```json
{
    "asyncOptions": {
        "url": "/api/{meta:tenantId}/teams/{field:category}",
        "dependsOn": "category"
    }
}
```

Result: `GET /api/acme/teams/engineering` — `category` is consumed by the URL template, not appended as `?category=engineering`.

> **Mixing**: You can combine both approaches. If `dependsOn: ["category", "region"]` and only `category` is consumed by a `{field:category}` template, then `region` is still
> appended automatically as a separate param.

| Field               | Type                         | Default                | Description                                                                                                                                                       |
| ------------------- | ---------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `url`               | `string`                     | required               | API endpoint. Supports `{meta:key}` path templates and `{field:key}` for dependsOn field values                                                                   |
| `method?`           | `'GET' \| 'POST'`            | `GET`                  | GET sends params as query string, POST sends as JSON body                                                                                                         |
| `responsePath?`     | `string`                     | —                      | Dot-path to array in response                                                                                                                                     |
| `labelKey?`         | `string`                     | `"{response:label}"`   | Use `{response:key}` for API response fields. Combining: `"{response:name} ({response:email})"`. Without braces = static literal                                  |
| `valueKey?`         | `string`                     | `"{response:value}"`   | Use `{response:key}` for API response fields. Without braces = static literal                                                                                     |
| `dependsOn?`        | `string \| string[]`         | —                      | Field(s) that trigger refetch. Values are sent to the API using their original field names unless consumed by `{field:key}` templates                             |
| `debounceMs?`       | `number`                     | `300`                  | Delay in ms before refetching when dependency values change                                                                                                       |
| `queryKey?`         | `string[]`                   | —                      | Explicit React Query cache key segments. Supports `{meta:key}` templates. If empty, auto-generated from URL                                                       |
| `requestParams?`    | `RequestParams`              | —                      | Query params and body params. Values support `{meta:key}` and `{field:key}` (dependency values) templates                                                         |
| `apiClient?`        | `'backend' \| 'service-now'` | `'backend'`            | Which API client to use. `'backend'` = backendApiClient, `'service-now'` = serviceNowApiClient                                                                    |
| `searchable?`       | `boolean`                    | `false`                | Enable server-side search. On dropdown open, fetches with empty search (limited results). On typing, re-fetches with search term appended as query param          |
| `searchDebounceMs?` | `number`                     | `300`                  | Debounce delay in ms for search term changes. Only used when `searchable` is true                                                                                 |
| `searchQueryParam?` | `string`                     | `nameLIKE{searchTerm}` | Query param template for search. `{searchTerm}` is replaced with user input. Examples: `nameLIKE{searchTerm}`, `user.nameLIKE{searchTerm}`, `search={searchTerm}` |

### Server-Side Search (`searchable`)

Enable server-side search for select/multiselect fields with large datasets. When `searchable` is true:

1. **On dropdown open** — fetches with empty search (returns limited results from the API)
2. **On user typing** — re-fetches with search term appended as `&sysparm_query={searchQueryParam}` to the URL
3. **Label caching** — previously fetched labels persist after dropdown closes

```json
{
    "name": "assignment_group",
    "type": "select",
    "label": "Assignment Group",
    "asyncOptions": {
        "url": "/api/now/table/sys_user_group?sysparm_fields=name,sys_id&sysparm_limit=20",
        "labelKey": "{response:name}",
        "valueKey": "{response:sys_id}",
        "responsePath": "result",
        "apiClient": "service-now",
        "searchable": true,
        "searchDebounceMs": 400,
        "searchQueryParam": "nameLIKE{searchTerm}"
    }
}
```

With user typing "network": GET `/api/now/table/sys_user_group?sysparm_fields=name,sys_id&sysparm_limit=20&sysparm_query=nameLIKE network`

**Assigned To with nested field search:**

```json
{
    "name": "assigned_to",
    "type": "select",
    "asyncOptions": {
        "url": "/api/now/table/sys_user_grmember?sysparm_fields=user,sys_id&sysparm_limit=20",
        "dependsOn": "assignment_group",
        "requestParams": {
            "queryParams": {
                "sysparm_query": "group={field:assignment_group}"
            }
        },
        "searchable": true,
        "searchQueryParam": "user.nameLIKE{searchTerm}"
    }
}
```

---

## Submit Config

Configure what happens on form submission. Submit URLs support `{meta:key}` path templates, `bodyMapping` uses `{field:key}` for form values, and `requestParams` support
`{meta:key}` templates.

```json
{
    "submitConfig": {
        "url": "/api/{meta:tenantId}/services",
        "method": "POST",
        "bodyMapping": {
            "name": "{field:service_name}",
            "ownerEmail": "{field:owner_email}",
            "fullName": "{field:first_name} {field:last_name}"
        },
        "queryKeyToInvalidate": ["services-{meta:tenantId}"],
        "requestParams": {
            "queryParams": { "source": "form-builder", "caller": "{meta:assignee}" }
        }
    }
}
```

With `meta = { tenantId: "acme", assignee: "john" }`: POST `/api/acme/services?source=form-builder&caller=john`

| Field                   | Type                                              | Description                                                                                                                          |
| ----------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `url`                   | `string`                                          | API endpoint. Supports `{meta:key}` path templates                                                                                   |
| `method`                | `'GET' \| 'POST' \| 'PUT' \| 'DELETE' \| 'PATCH'` | HTTP method                                                                                                                          |
| `bodyMapping?`          | `Record<string, string>`                          | Template mapping — use `{field:key}` for form values, `{meta:key}` for runtime context (see [Mapping Templates](#mapping-templates)) |
| `queryKeyToInvalidate?` | `string[]`                                        | React Query cache keys to invalidate after submit. Supports `{meta:key}` templates                                                   |
| `requestParams?`        | `RequestParams`                                   | Query params with `{meta:key}` template support                                                                                      |
| `apiClient?`            | `'backend' \| 'service-now'`                      | Which API client to use. Default: `'backend'`                                                                                        |

---

## Initial Values Config

Fetch pre-existing data for update/delete/view modes.

```json
{
    "initialValuesConfig": {
        "url": "/api/{meta:tenantId}/services/{meta:ticketId}",
        "method": "GET",
        "responsePath": "data.record",
        "fieldMapping": {
            "owner_email": "{response:ownerEmail}",
            "service_name": "{response:serviceName}",
            "display_name": "{response:firstName} {response:lastName}"
        }
    }
}
```

| Field            | Type                         | Default     | Description                                                                                                   |
| ---------------- | ---------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------- |
| `url`            | `string`                     | required    | API endpoint. Supports `{meta:key}` path templates                                                            |
| `method?`        | `'GET' \| 'POST'`            | `GET`       | HTTP method                                                                                                   |
| `responsePath?`  | `string`                     | —           | Dot-path to values object in response                                                                         |
| `fieldMapping?`  | `Record<string, string>`     | —           | Template mapping — use `{response:key}` for API response fields (see [Mapping Templates](#mapping-templates)) |
| `queryKey?`      | `string[]`                   | —           | Explicit React Query cache key segments. Supports `{meta:key}` templates                                      |
| `requestParams?` | `RequestParams`              | —           | Query params and body params with `{meta:key}` template support                                               |
| `apiClient?`     | `'backend' \| 'service-now'` | `'backend'` | Which API client to use. `'backend'` = backendApiClient, `'service-now'` = serviceNowApiClient                |

---

## Template Prefix System

All templates **MUST** use a prefixed `{prefix:key}` syntax to explicitly reference their data source. Bare `{key}` without a prefix is a **validation error** and will prevent
saving the form config.

### Available Prefixes

| Prefix          | Source            | Example                        | Description                                                     |
| --------------- | ----------------- | ------------------------------ | --------------------------------------------------------------- |
| `meta:`         | Meta object       | `{meta:ticketType}`            | Runtime context from page code                                  |
| `field:`        | Form field values | `{field:category}`             | Current form values (reactive — updates as user types)          |
| `initialValue:` | Initial values    | `{initialValue:original_name}` | Pre-fetched initial values (mapped)                             |
| `response:`     | API response item | `{response:sys_id}`            | Raw API response data (used in labelKey/valueKey, fieldMapping) |

### Prefix Scopes

Each prefix is only meaningful in certain contexts. Using a prefix outside its scope will resolve to empty.

#### `meta:` — Available everywhere

Runtime context from page code. Can be used in any template property. Resolved at conversion/fetch time.

- URLs, queryParams, bodyParams, queryKey, bodyMapping, fieldMapping, labelKey/valueKey
- label, placeholder, defaultValue
- Condition field refs (`"meta:ticketType"`), condition values (`"{meta:expectedType}"`)

#### `field:` — Runtime form values only

Current form field values. Only meaningful at runtime when form values exist.

- **label, placeholder** — reactive at render time (re-evaluated as user types)
- **Condition `value`** — compared against live field values at each evaluation
- **bodyMapping values** — form values at submit time
- **NOT available in**: defaultValue (fields not populated yet), queryKey, URLs (use `meta:` or dependency URL injection instead)

#### `initialValue:` — Only for field defaults and display

Pre-fetched data from `initialValuesConfig`. Available after `fetchInitialValues()` completes. Restricted to field-level display and default properties only.

- **fieldMapping values** — `{initialValue:key}` resolves alongside `{response:key}` when mapping initial values
- **label, placeholder** — resolved at conversion time
- **defaultValue** — resolved at conversion time
- **Condition field refs** (`"initialValue:original_status"`), **condition values**
- **NOT available in**: URLs, queryParams, bodyParams, queryKey, bodyMapping, labelKey/valueKey

#### `response:` — API response data only

Raw data from an API response. Only meaningful where the system iterates over response items or maps response fields.

- **labelKey/valueKey** — each `{response:key}` resolves from the current response item
- **fieldMapping values** — `{response:key}` resolves from the full initial values API response
- **NOT available in**: URLs, queryParams, bodyParams, label, placeholder, conditions, bodyMapping

### Where Templates Are Supported

| Property                       | Supported Prefixes                                         | Resolved When                                                      |
| ------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------ |
| **`label`**                    | `meta:`, `field:`, `initialValue:`                         | `meta:`/`initialValue:` at conversion; `field:` reactive at render |
| **`placeholder`**              | `meta:`, `field:`, `initialValue:`                         | Same as label                                                      |
| **`defaultValue`**             | `meta:`, `initialValue:`                                   | At conversion time                                                 |
| **Condition `field`**          | `meta:`, `initialValue:` (as prefix on field name)         | At runtime (each re-evaluation)                                    |
| **Condition `value`**          | `meta:`, `field:`, `initialValue:`                         | At runtime (each re-evaluation)                                    |
| **URL paths**                  | `meta:`, `field:`                                          | At fetch/submit time                                               |
| **`queryParams`/`bodyParams`** | `meta:`, `field:` (async options only — dependency values) | At fetch/submit time                                               |
| **`queryKey` segments**        | `meta:`                                                    | At fetch time                                                      |
| **`bodyMapping` values**       | `meta:`, `field:`                                          | At submit time                                                     |
| **`fieldMapping` values**      | `meta:`, `response:`                                       | At initial values fetch                                            |
| **`labelKey`/`valueKey`**      | `meta:`, `response:`                                       | Per response item                                                  |

### Three Scenarios

**Scenario 1: Direct initial values** — pass data you already have, no fetch needed:

```tsx
const config = convertToRuntimeConfig(record, {
    initialValues: ticketData, // already have the data (e.g., from a parent component)
    meta: { tenantId: 'acme' }, // still needed for async options URLs
});
// If record has fieldMapping, the converter applies it to ticketData automatically
```

**Scenario 2: Fetch mapped values** — for pure config-driven forms that don't need the raw response:

```tsx
const meta = { ticketId: 'INC-123', tenantId: 'acme' };

// fetchInitialValues fetches AND applies fieldMapping — returns flat form-ready values
const values = await fetchInitialValues(record, meta);

const config = convertToRuntimeConfig(record, {
    initialValues: values,
    meta, // same meta flows to all async options
});
// Note: fieldMapping is applied twice if passed here (once by fetchInitialValues, once by converter)
// This is harmless when fieldMapping uses {response:key} templates — the mapped flat values
// just pass through unchanged on the second application since the response keys no longer exist.
```

**Scenario 3: Fetch raw values** — for hybrid forms that need both mapped values AND the raw response:

```tsx
const meta = { ticketId: 'INC-123', tenantId: 'acme' };

// fetchRawInitialValues fetches WITHOUT applying fieldMapping — returns raw API response
const rawData = await fetchRawInitialValues(record, meta);
// rawData has the original structure: { state: { display_value: "New", value: "1" }, ... }

const config = convertToRuntimeConfig(record, {
    initialValues: rawData, // converter applies fieldMapping internally
    meta,
});

// rawData is also available for code-driven behavior (e.g., fallback options)
field.options = withFallbackOption(field.options, rawData.state); // needs nested { display_value, value }
```

### URL Path Templates

Use `{meta:key}` tokens in URLs for runtime context and `{field:key}` for dependency field values:

```json
{
    "asyncOptions": {
        "url": "/api/{meta:tenantId}/teams/{field:category}",
        "dependsOn": "category"
    }
}
```

With `meta = { tenantId: "acme" }` and `category = "engineering"`: GET `/api/acme/teams/engineering`

### Request Params with Templates

`requestParams.queryParams` and `requestParams.bodyParams` values support `{meta:key}` template syntax everywhere. In **async options**, they also support `{field:key}` to embed
dependency field values inside query/body param values (resolved at query time). Static values (no braces) pass through as-is.

```json
{
    "initialValuesConfig": {
        "url": "/api/{meta:tenantId}/tickets/{meta:ticketId}",
        "requestParams": {
            "queryParams": {
                "format": "json",
                "assignee": "{meta:assignee}"
            }
        }
    }
}
```

With `meta = { tenantId: "acme", ticketId: "INC-123", assignee: "john" }`: GET `/api/acme/tickets/INC-123?format=json&assignee=john`

- `format: "json"` — static, always appended
- `assignee: "{meta:assignee}"` — resolved from `meta.assignee`
- `{meta:tenantId}`, `{meta:ticketId}` — URL path tokens resolved from `meta`

### Body Params (POST only)

```json
{
    "initialValuesConfig": {
        "url": "/api/records",
        "method": "POST",
        "requestParams": {
            "bodyParams": {
                "ticketId": "{meta:ticketId}",
                "fields": "all"
            }
        }
    }
}
```

With `meta = { ticketId: "INC-123" }`: POST body: `{ "ticketId": "INC-123", "fields": "all" }`

### RequestParams Reference

| Field          | Type                     | Description                                                                                                                                |
| -------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `queryParams?` | `Record<string, string>` | Query parameters. Values support `{meta:key}` templates. In async options, also supports `{field:key}` for dependency field values         |
| `bodyParams?`  | `Record<string, string>` | Body parameters for POST. Values support `{meta:key}` templates. In async options, also supports `{field:key}` for dependency field values |

### Query Key Templates

`queryKey` (async options, initial values) and `queryKeyToInvalidate` (submit config) arrays support `{meta:key}` template syntax. Each segment is resolved from `meta` at runtime.

```json
{
    "asyncOptions": {
        "url": "/api/{meta:tenantId}/teams",
        "queryKey": ["teams", "{meta:tenantId}"]
    },
    "submitConfig": {
        "url": "/api/{meta:tenantId}/services",
        "method": "POST",
        "queryKeyToInvalidate": ["services-{meta:tenantId}"]
    },
    "initialValuesConfig": {
        "url": "/api/{meta:tenantId}/services/{meta:serviceId}",
        "queryKey": ["service", "{meta:tenantId}", "{meta:serviceId}"]
    }
}
```

With `meta = { tenantId: "acme", serviceId: "svc-42" }`:

- Async options queryKey: `["teams", "acme", depVal]`
- Initial values queryKey: `["service", "acme", "svc-42"]`
- After submit invalidates: `["services-acme"]`

The template contract auto-detection in the form builder UI extracts all `{prefix:key}` references and categorizes them by source prefix.

### Via DynamicFormRenderer

`DynamicFormRenderer` accepts `meta`, `variant`, `classNames`, and `className` and passes them through to `convertToRuntimeConfig` and `DynamicForm`:

```tsx
<DynamicFormRenderer
    fields={form.fields}
    formName={form.name}
    variant="outlined"
    meta={{ ticketId: 'INC-123', tenantId: 'acme' }}
    classNames={{ fieldGrid: 'grid-cols-1 gap-4', label: 'text-sm', input: 'text-sm', selectTrigger: 'text-sm' }}
    className="max-w-lg"
/>
```

`DynamicFormRenderer` also handles initial values fetching (via `useQuery`), showing loading/error overlays automatically when `initialValuesConfig` is set and the mode requires it
(`update`/`delete`/`view`).

### MetaFieldDefinition

Describes the expected shape of the `meta` object. Stored in `FormConfigRecord.metaFields` and displayed in the form builder UI.

```json
{
    "metaFields": [
        { "key": "ticketId", "type": "string", "description": "SNOW ticket ID (e.g. INC-123)" },
        { "key": "tenantId", "type": "string", "description": "Tenant identifier" },
        { "key": "assignee", "type": "string", "description": "Current assignee user ID" }
    ]
}
```

| Field          | Type                                | Description                 |
| -------------- | ----------------------------------- | --------------------------- |
| `key`          | `string`                            | Key name in the meta object |
| `type`         | `'string' \| 'number' \| 'boolean'` | Expected data type          |
| `description?` | `string`                            | Human-readable description  |

The form builder auto-detects all `{prefix:key}` tokens across the entire config and shows them in the **Template Contract** panel, categorized by source prefix, alongside any
manually defined `metaFields`.

### Resolution Priority

**Async Options**: `meta` < `dependsOn` field values (field values override meta for same keys in URL resolution)

**Submit Config**: `bodyMapping` resolves `{field:key}` from form values and `{meta:key}` from runtime context — no merge step

---

## Mapping Templates

All mapping records (`bodyMapping`, `fieldMapping`) use the same syntax: **key = target name, value = static string or `{prefix:template}`**.

- **Static** (no braces): `"status": "active"` — adds literal value to output
- **Single-field template**: `"name": "{field:service_name}"` — resolves from source (effective rename)
- **Multi-field template**: `"fullName": "{field:first_name} {field:last_name}"` — combines multiple source fields
- **Dot-path template**: `"city": "{field:address.city}"` — resolves from nested objects

```json
"bodyMapping": {
  "name": "{field:service_name}",                   // single-field: resolves service_name -> name
  "fullName": "{field:first_name} {field:last_name}",// multi-field: combines into fullName
  "city": "{field:address.city}",                   // dot-path: resolves nested address.city -> city
  "source": "toolkit"                               // static: always sent as "toolkit"
}
```

```json
"fieldMapping": {
  "owner_email": "{response:ownerEmail}",              // single-field: resolves ownerEmail -> owner_email
  "display_name": "{response:firstName} {response:lastName}", // multi-field: combines into display_name
  "company": "{response:company.name}"                  // dot-path: resolves nested path
}
```

**Template behavior**: Source fields consumed by `{...}` templates are **removed** from output unless also mapped elsewhere. Dot-path templates consume the root key (e.g.,
`{field:address.city}` consumes `address`). Unmapped source fields pass through with their original key.

**Template validation**: The form builder UI validates all `{prefix:key}` syntax — catches unmatched braces, empty `{}` placeholders, nested `{{}}` braces, bare tokens without
prefix, and unknown prefixes. Forms with template errors cannot be saved.

> For async options, use `labelKey`/`valueKey` templates to combine response fields (e.g., `"{response:firstName} {response:lastName}"`).

---

## Full Example — SNOW Ticket Update Form

A ServiceNow ticket update form that uses `meta` for runtime context:

```json
{
    "id": "snow-ticket-update",
    "name": "Update SNOW Ticket",
    "description": "Update a ServiceNow incident ticket",
    "mode": "update",
    "metaFields": [
        { "key": "ticketId", "type": "string", "description": "SNOW ticket ID (e.g. INC0012345)" },
        { "key": "tenantId", "type": "string", "description": "Tenant identifier" }
    ],
    "fields": [
        {
            "name": "short_description",
            "type": "text",
            "label": "Short Description",
            "required": true,
            "colSpan": 2,
            "validation": { "maxLength": 160 }
        },
        {
            "name": "category",
            "type": "select",
            "label": "Category",
            "required": true,
            "asyncOptions": {
                "url": "/api/{meta:tenantId}/snow/categories",
                "labelKey": "{response:name}",
                "valueKey": "{response:sys_id}"
            }
        },
        {
            "name": "subcategory",
            "type": "select",
            "label": "Subcategory",
            "requiredWhen": { "field": "category", "operator": "not_empty" },
            "asyncOptions": {
                "url": "/api/{meta:tenantId}/snow/subcategories",
                "labelKey": "{response:name}",
                "valueKey": "{response:sys_id}",
                "dependsOn": "category"
            }
        },
        {
            "name": "assignment_group",
            "type": "select",
            "label": "Assignment Group",
            "asyncOptions": {
                "url": "/api/{meta:tenantId}/snow/groups",
                "labelKey": "{response:name} ({response:email})",
                "valueKey": "{response:sys_id}",
                "requestParams": {
                    "queryParams": { "active": "true" }
                }
            }
        },
        {
            "name": "priority",
            "type": "select",
            "label": "Priority",
            "required": true,
            "options": [
                { "label": "1 - Critical", "value": "1" },
                { "label": "2 - High", "value": "2" },
                { "label": "3 - Medium", "value": "3" },
                { "label": "4 - Low", "value": "4" }
            ]
        },
        {
            "name": "work_notes",
            "type": "textarea",
            "label": "Work Notes",
            "colSpan": 2,
            "validation": { "maxLength": 4000 },
            "conditionalValidation": [
                {
                    "when": { "field": "priority", "operator": "equals", "value": "1" },
                    "rules": { "minLength": 50, "minLengthMessage": "Critical tickets require detailed work notes (50+ chars)" }
                }
            ]
        }
    ],
    "submitConfig": {
        "url": "/api/{meta:tenantId}/snow/tickets/{meta:ticketId}",
        "method": "PUT",
        "bodyMapping": {
            "shortDescription": "{field:short_description}",
            "assignmentGroup": "{field:assignment_group}",
            "workNotes": "{field:work_notes}"
        },
        "queryKeyToInvalidate": ["snow-tickets"],
        "requestParams": {
            "queryParams": { "sysparm_display_value": "true" }
        }
    },
    "initialValuesConfig": {
        "url": "/api/{meta:tenantId}/snow/tickets/{meta:ticketId}",
        "responsePath": "result",
        "fieldMapping": {
            "short_description": "{response:shortDescription}",
            "assignment_group": "{response:assignmentGroup}",
            "work_notes": "{response:workNotes}"
        }
    }
}
```

**Page code:**

```tsx
// meta provides runtime context — the form config defines WHERE to use each key
const meta = { ticketId: 'INC0012345', tenantId: 'acme-corp' };

const values = await fetchInitialValues(record, meta);
// Fetches: GET /api/acme-corp/snow/tickets/INC0012345

const config = convertToRuntimeConfig(record, {
    queryClient,
    initialValues: values,
    meta, // flows to submit, async options, and initial values
});
// Submit URL:     PUT /api/acme-corp/snow/tickets/INC0012345?sysparm_display_value=true
// Categories URL: /api/acme-corp/snow/categories
// Groups URL:     /api/acme-corp/snow/groups?active=true
```

---

## Form Builder UI

The admin portal includes a visual form builder for creating/editing `FormConfigRecord` objects without writing JSON.

### Components

| Component             | Path                                    | Purpose                                                                                        |
| --------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `FormConfigEditor`    | `components/smart/FormConfigEditor/`    | Main editor: form name, mode, fields list, submit config, initial values config, meta contract |
| `FieldConfigPanel`    | `components/smart/FieldConfigPanel/`    | Per-field editor: type, validation, conditions, async options, onChange effects                |
| `DynamicFormRenderer` | `components/smart/DynamicFormRenderer/` | Live preview & runtime renderer using `convertToRuntimeConfig()`                               |

### JSON Mapping Inputs

All JSON mapping fields (`bodyMapping`, `fieldMapping`) use a **blur-to-save** input: type freely, and the value is parsed and saved when you click away (blur). Validation runs on
blur: "Invalid JSON" for malformed JSON, and template validation for unmatched braces, empty `{}`, nested `{{}}`, bare tokens without prefix, and unknown prefixes. Forms with any
template errors cannot be saved.

### What the UI Exposes

**Basic**: name, label, type, placeholder, defaultValue, colSpan, required, disabled

**Field Inclusion**: Each field in the list has a checkbox — checked means the field is included in the form, unchecked marks it as `hidden` (completely excluded from rendering,
registration, and submission)

**Validation**: static (min, max, minLength, maxLength, pattern — each with custom message; date-specific: minDate, maxDate, minDateField, maxDateField — each with custom message),
conditional (when condition + then rules)

**Conditions**: visibleWhen, disabledWhen, requiredWhen — single-field or multi-field (AND/OR). Each condition row has a **Source** dropdown to select between Form Field (select
dropdown), Meta (text input), or Initial Value (text input). Operators include `in`/`not_in` (comma-separated values in UI). Compare values support `{prefix:key}` templates with
live validation

**onChange Effects**: declarative field updates — set target field + value, optional condition. Supports `{field:key}` templates in setValue

**Options**: static label/value pairs, async options (URL with `{meta:key}` path templates, method, responsePath, labelKey with `{response:key}`, valueKey with `{response:key}`,
dependsOn, debounceMs, queryKey with `{meta:key}`, requestParams with `{meta:key}`)

**Submit Guards**: checkboxes for "No Changes Warning" and "Confirm Before Submit". Expandable details section for custom messages — no-changes title/message, confirm
title/message/proceed label/discard label. Guards and messages are passed through to `DynamicForm` at runtime

**Form-level**: mode selector, variant (`standard`/`outlined`/`filled`), submit/submitting labels, trackDirty, submit config (URL with `{meta:key}`, method, bodyMapping with
`{field:key}`, query keys, requestParams with `{meta:key}`), initial values config (URL with `{meta:key}`, method, responsePath, fieldMapping with `{response:key}`, queryKey with
`{meta:key}`, requestParams with `{meta:key}`)

**Template Contract**: auto-detected `{prefix:key}` tokens from all templates, segregated by source prefix — **meta:** (runtime context), **field:** (form values),
**initialValue:** (pre-loaded data), **response:** (API response) — each with color-coded badges and "Used in" source listings. Tokens are extracted from all condition locations
including `visibleWhen`, `disabledWhen`, `requiredWhen`, `conditionalValidation[].when`, and `onChangeEffects[].when` (both `field` references and `value` templates), plus
`onChangeEffects[].setValue` templates. Bare tokens are shown as errors. Plus editable meta field definitions (key, type, description).

**Template Validation**: All templates across the form are validated — catches unmatched braces, empty `{}`, nested `{{}}`, bare tokens without prefix, and unknown prefixes.
**Save/Create button is disabled** when any template errors exist anywhere in the form config (including invalid JSON in mapping inputs).

**Code-Override Info Banner**: A collapsible amber banner at the top of the editor explains which config features can be overridden at code level. This helps admins understand that
`submitConfig` and `initialValuesConfig` may not take effect for forms consumed by hybrid pages (like `UpdateTicketForm`) that override behavior with code-driven `onSubmit` or
`fetchRawInitialValues`. The config values still serve as documentation of the API contract.

### Shared Input Components

All form builder input components are in a single shared source file (`components/shared/form-builder-inputs.tsx`), used by both `FormConfigEditor` and `FieldConfigPanel`:

| Component          | Purpose                                                                                                                                                                                              |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TemplateInput`    | Text input with live `{prefix:key}` template validation. Accepts mixed text + templates (e.g., `"Hello {meta:user}"`). Bare text without braces is fine, but any `{token}` must have a valid prefix. |
| `TemplateKeyInput` | Text input that additionally rejects bare strings entirely — the whole value must be a template reference (e.g., `{response:name}` not just `name`). Used for mapping keys.                          |
| `TemplateCSVInput` | Comma-separated input with per-segment `{prefix:key}` validation. Used for queryKey arrays.                                                                                                          |
| `JsonInput`        | JSON input with live parse + template validation. Reports errors via `onError` callback so the parent can disable save.                                                                              |
| `Label`            | Simple label wrapper with optional required indicator.                                                                                                                                               |
| `SectionTitle`     | Section header styling.                                                                                                                                                                              |

---

## Config-Based vs Code-Driven Comparison

| Feature                      | Config-Based (JSON)                                                                                                                  | Code-Driven (Runtime)                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| **Storage**                  | Database / JSON file                                                                                                                 | TypeScript code                                                                |
| **Conditions**               | Declarative operators (`equals`, `in`, `not_in`, `contains`, `gt`, `not_empty`, etc.)                                                | JavaScript functions                                                           |
| **Validation pattern**       | String (`"^[a-z]+$"`)                                                                                                                | RegExp (`/^[a-z]+$/`)                                                          |
| **Custom validation**        | Not available                                                                                                                        | `custom: (value, allValues) => string \| undefined`                            |
| **Async options**            | URL (with `{meta:key}` path templates) + responsePath + labelKey/valueKey (`{response:key}`) + debounceMs + queryKey + requestParams | `queryFn` function + debounceMs                                                |
| **Server-side search**       | `searchable` + `searchQueryParam` + `searchDebounceMs` (appends search term to URL)                                                  | `searchable` + `searchDebounceMs` (search term passed to `queryFn` as 2nd arg) |
| **Async validation**         | URL + errorPath                                                                                                                      | `validate` function                                                            |
| **Submit/submitting labels** | `submitLabel`, `submittingLabel`                                                                                                     | `submitLabel`, `submittingLabel`                                               |
| **Dirty tracking**           | `trackDirty`                                                                                                                         | `trackDirty` + `onDirtyChange` callback                                        |
| **Imperative handle**        | Not available (runtime-only)                                                                                                         | `formRef` — `setFieldValue`, `getFieldValue`, etc.                             |
| **onChange effects**         | `onChangeEffects` — declarative `setField`/`setValue` with optional condition                                                        | `onChange: (value, formApi) => void`                                           |
| **Field combining**          | Mapping templates (`"{a} {b}"`)                                                                                                      | Manual code in mapping functions                                               |
| **Input variant**            | `variant: 'standard' \| 'outlined' \| 'filled'` (DB-stored or code override)                                                         | `variant` in `FormConfig`                                                      |
| **Style overrides**          | Code-based `classNames` prop (15 slots, not stored in DB)                                                                            | `classNames` in `FormConfig`                                                   |
| **Submit**                   | `submitConfig` (URL with `{meta:key}`, method, bodyMapping with `{field:key}`, requestParams with `{meta:key}`)                      | `onSubmit` function                                                            |
| **Initial values**           | `initialValuesConfig` (URL with `{meta:key}`, responsePath, fieldMapping with `{response:key}`, queryKey, requestParams)             | `initialValues` object                                                         |
| **Runtime context**          | `meta` object (flat `Record<string, unknown>`)                                                                                       | Direct code access                                                             |
| **Cache invalidation**       | `queryKeyToInvalidate`                                                                                                               | Manual `queryClient.invalidateQueries()`                                       |
| **API client selection**     | `apiClient: 'backend' \| 'service-now'` per submit, initial values, and each async options                                           | Direct axios client usage                                                      |
| **Submit values mode**       | `submitWithValues: 'changed-only' \| 'all-values'`                                                                                   | `submitWithValues` in `FormConfig`                                             |
| **Non-admin editable**       | Yes (via form builder UI)                                                                                                            | No (requires code change)                                                      |

### When to Use Which

**Config-based** when:

- Non-developers need to create/edit forms
- Forms are stored in a database
- Standardized API patterns (CRUD endpoints)

**Code-driven** when:

- Complex custom validation logic
- Non-standard async behavior
- Field change cascading (`onChange`)
- Integration with specific libraries/state
- One-off forms with unique requirements

**Hybrid approach** when:

- Form structure is config-driven (fields, visibility, conditional validation)
- Behavior needs code (custom options from hooks, `onChange` handlers, imperative access, custom submit logic)
- Integration with domain-specific services (e.g., ServiceNow APIs)

### Hybrid Approach Pattern

Use `convertToRuntimeConfig()` for the base config, then override specific behaviors in code. The config defines _what_ (structure, endpoints, field rules) — code controls _what
happens with the results_ (custom notifications, response syncing, external callbacks).

#### What Can Be Overridden and Why

`convertToRuntimeConfig` spreads `...rest` overrides onto the generated config, so any `FormConfig` property can be overridden. The key overrides:

| Override            | Config Provides                                                            | Code Override Needed When                                                                                                                        |
| ------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`onSubmit`**      | `submitConfig` -> auto-generated API call + static success message         | Custom notifications (toast with response data), form value syncing from response, external callbacks (`onSubmitSuccess`, `onDirtyChange`)       |
| **`initialValues`** | `initialValuesConfig` -> `fetchInitialValues()` returns mapped flat values | Code needs the raw API response structure (e.g., nested `{ display_value, value }` for fallback options) — use `fetchRawInitialValues()` instead |
| **`onChange`**      | `onChangeEffects` -> declarative `setField`/`setValue`                     | Complex logic (priority matrix), external callbacks (`onTicketStateChange`), multi-step cascades                                                 |
| **`options`**       | `asyncOptions` / static `options`                                          | Injecting fallback options from raw response data (`withFallbackOptionFromSnowDataField`)                                                        |

#### When `submitConfig` Is Sufficient (No Override Needed)

Pure config-driven forms (`DynamicFormRenderer`) use `submitConfig` directly. The auto-generated `onSubmit`:

1. Resolves URL templates (`{meta:key}`)
2. Applies `bodyMapping` (`{field:key}`)
3. Makes the API call (GET/POST/PUT/PATCH/DELETE)
4. Invalidates React Query cache keys
5. Returns `{ message }` from the response

This works when:

- A static success message is fine (e.g., "Form submitted successfully")
- No post-submit form value syncing is needed
- No external callbacks to notify parent components
- Default error handling (thrown error caught by DynamicForm) is acceptable

#### When `onSubmit` Must Be Code-Driven

Override `onSubmit` when the config-driven submit can't express your post-submit behavior:

**1. Custom notifications from response data**

Config submit returns a static message string. But `usePatchTicketMutation` reads `response.number.display_value` to show "INC0012345 updated successfully!" — that requires access
to the actual response object.

**2. Form value syncing from server response**

After a PATCH, the server may transform values (e.g., ServiceNow auto-sets priority when urgency changes server-side). Code reads the response and updates form fields via
`formRef.setFieldValue()` to keep the UI in sync without a full refetch.

**3. External callbacks**

`onSubmitSuccess({ updatedTicketResponse, ticketId })` notifies parent components (e.g., refresh ticket list, update header). `onDirtyChange(false)` resets the dirty state. These
are runtime concerns that don't belong in config.

**4. Custom error handling**

`usePatchTicketMutation.onError` shows a `globalAlertDialog` with parsed error details. Config submit would just throw — DynamicForm shows a generic error banner.

> **Note:** When `onSubmit` is passed as an override, it **replaces** the config-generated one entirely. The `submitConfig` in the record is effectively unused at runtime — it
> serves as documentation of the endpoint and would be used if the form were rendered purely config-driven.

#### When `fetchRawInitialValues` Is Needed vs `fetchInitialValues`

See [`fetchRawInitialValues` vs `fetchInitialValues`](#fetchrawinitialvalues-vs-fetchinitialvalues--when-to-use-which) in the API Reference section.

#### Full Hybrid Example

```tsx
import { convertToRuntimeConfig, fetchRawInitialValues, getInitialValuesQueryKey } from '../utils/convert-to-runtime-config';
import { fetchFormConfigByCode } from '../services/form-config-api';
import type { FormImperativeHandle } from '@/shared/modules/dynamic-form';

// 1. Fetch form config from DB (or define as static constant)
const formConfigQuery = useQuery({
    queryKey: ['form-config', 'update-ticket'],
    queryFn: fetchFormConfigByCode.bind(null, 'update-ticket'),
    staleTime: Infinity,
});
const formConfigRecord = formConfigQuery.data;

// 2. Self-fetch raw data using the config's initialValuesConfig URL
//    Uses fetchRawInitialValues (not fetchInitialValues) because we need
//    the nested { display_value, value } structure for fallback options.
const meta = useMemo(() => ({ recordType, recordId }), [recordType, recordId]);

const rawDataQuery = useQuery({
    queryKey: formConfigRecord ? getInitialValuesQueryKey(formConfigRecord, meta) : ['initial-values-disabled'],
    queryFn: () => fetchRawInitialValues(formConfigRecord!, meta),
    enabled: !!recordId && !!recordType && !!formConfigRecord,
});

const rawData = rawDataQuery.data;

// 3. Convert to runtime config — fieldMapping is applied to raw data automatically
const formRef = useRef<FormImperativeHandle>(null);
const patchMutation = usePatchTicketMutation();

const config = useMemo(() => {
    if (!formConfigRecord || !rawData) return null;
    const base = convertToRuntimeConfig(formConfigRecord, {
        mode: 'update',
        initialValues: rawData, // fieldMapping from config applied automatically
        meta,
        onDirtyChange,

        // Override config's submitConfig — we need custom notifications + form syncing
        onSubmit: async (changedValues) => {
            // patchMutation handles: API call, success toast with ticket number, error dialog
            const response = await patchMutation.mutateAsync({
                ticketId,
                ticketType,
                changes: changedValues,
            });

            // Sync form values with server response — server may transform values
            for (const key of Object.keys(changedValues)) {
                if (key in response && response[key]?.value) {
                    formRef.current?.setFieldValue(key, response[key]?.value);
                }
            }

            await onSubmitSuccess?.({ response, ticketId });
            onDirtyChange?.(false);
            return { message: 'Ticket updated successfully' };
        },
    });

    // 4. Inject code-driven behavior: fallback options + complex onChange
    //    Simple onChange effects (clear field, set value) are config-driven via onChangeEffects.
    //    Code-driven onChange is only needed for: external callbacks, complex logic (priority matrix)
    for (const field of base.fields) {
        switch (field.name) {
            case 'state': {
                // Fallback option: ensures the current value appears even if not in async options yet
                field.options = withFallbackOption(field.options, rawData.state);
                // Wrap config-generated onChange (from onChangeEffects) to also fire external callback
                const configOnChange = field.onChange;
                field.onChange = (value, formApi) => {
                    configOnChange?.(value, formApi); // Run config effects (e.g. set close_code)
                    onTicketStateChange?.(value as string); // External callback (not expressible in config)
                };
                break;
            }
            case 'urgency':
                field.options = withFallbackOption(field.options, rawData.urgency);
                // Complex logic: priority matrix lookup — not expressible in config
                field.onChange = (value) => {
                    const impact = formRef.current?.getFieldValue('impact') as string;
                    formRef.current?.setFieldValue('priority', getPriorityFromMatrix(value as string, impact));
                };
                break;
        }
    }

    return base;
}, [formConfigRecord, rawData, meta, onDirtyChange]);

// 5. Render with formRef for external imperative access
if (!config) return <LoadingPlaceholder />;
<DynamicForm config={config} formRef={formRef}>
    {/* Optional children (e.g., journal entries, read-only sections) */}
</DynamicForm>;
```

#### Override Decision Flowchart

```
Do you need custom post-submit behavior?
  ├─ NO  -> Let submitConfig handle it (DynamicFormRenderer pattern)
  └─ YES -> Override onSubmit
           ├─ Custom notifications from response data? -> Use mutation hook
           ├─ Sync form values from response?          -> Use formRef.setFieldValue
           └─ Notify parent components?                -> Use external callbacks

Do you need the raw API response structure?
  ├─ NO  -> Use fetchInitialValues (DynamicFormRenderer pattern)
  └─ YES -> Use fetchRawInitialValues
           └─ e.g., fallback options need nested { display_value, value }

Do you need custom onChange logic?
  ├─ Simple (clear field, set value) -> Use onChangeEffects in config
  └─ Complex (matrix lookup, external callback) -> Override field.onChange in code
           └─ If field also has onChangeEffects, WRAP the config-generated handler
```

See `UpdateTicketForm.tsx` for a complete real-world example using this pattern with ServiceNow integration, `onChangeEffects` for field cascading, priority matrix calculation, and
AI-generated content injection via `formRef`.

---

## API Reference

### `convertToRuntimeConfig(record, options?)`

Converts a `FormConfigRecord` to a runtime `FormConfig`. The `meta` object flows through to every async option's `queryFn` for URL template resolution.

```typescript
import { convertToRuntimeConfig, fetchInitialValues, fetchRawInitialValues } from '../utils/convert-to-runtime-config';

const meta = { ticketId: 'INC-123', tenantId: 'acme' };

// Option A: fetchInitialValues — returns flat form-ready values (fieldMapping already applied)
// Use when you only need mapped values (pure config-driven forms like DynamicFormRenderer)
const mappedValues = await fetchInitialValues(record, meta);

// Option B: fetchRawInitialValues — returns raw API response (fieldMapping NOT applied)
// Use when you also need the original response structure for code-driven behavior
// (e.g., fallback options with nested { display_value, value } from ServiceNow)
// fieldMapping is applied automatically by convertToRuntimeConfig when raw data is passed
const rawValues = await fetchRawInitialValues(record, meta);

const config = convertToRuntimeConfig(record, {
    queryClient, // for cache invalidation after submit
    initialValues: rawValues, // caller-fetched values — if fieldMapping exists, converter applies it
    meta, // flows to all async options for URL template resolution
    mode: 'update', // override mode
    onSubmitSuccess: () => {}, // runtime-only callbacks
    // onSubmit: override config's submitConfig when custom post-submit behavior is needed
});
```

### `fetchInitialValues(record, meta?)`

Fetches and maps initial values from the configured API endpoint. Returns flat form-ready values with `fieldMapping` applied.

```typescript
import { fetchInitialValues } from '../utils/convert-to-runtime-config';

// Simple — no runtime context needed
const values = await fetchInitialValues(record);

// With meta — resolves {meta:key} templates in URLs and requestParams
const values = await fetchInitialValues(record, {
    ticketId: 'INC-123',
    tenantId: 'acme',
    assignee: 'john',
});
// URL: /api/{meta:tenantId}/tickets/{meta:ticketId} -> /api/acme/tickets/INC-123
// queryParams: { "assignee": "{meta:assignee}" } -> ?assignee=john
```

### `fetchRawInitialValues(record, meta?)`

Fetches initial values from the configured API endpoint **without** applying `fieldMapping`. Returns the raw API response data. Useful when the caller needs the original response
structure (e.g., for fallback options that reference nested ServiceNow `{ display_value, value }` fields).

```typescript
import { fetchRawInitialValues } from '../utils/convert-to-runtime-config';

const rawData = await fetchRawInitialValues(record, { ticketId, ticketType });
// rawData has nested structure: { state: { display_value: "New", value: "1" }, ... }

// Pass raw data to convertToRuntimeConfig — fieldMapping is applied automatically
const config = convertToRuntimeConfig(record, { initialValues: rawData, meta });

// Also use rawData for code-driven behavior (e.g., fallback options)
field.options = withFallbackOption(field.options, rawData.state);
```

### `fetchRawInitialValues` vs `fetchInitialValues` — When to Use Which

Both functions fetch data from the same `initialValuesConfig.url`. The difference is what happens **after** the fetch:

|                                 | `fetchInitialValues`                                                                    | `fetchRawInitialValues`                                                                |
| ------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Applies `fieldMapping`?**     | Yes — returns flat, form-ready values                                                   | No — returns the raw API response                                                      |
| **Who applies `fieldMapping`?** | The function itself                                                                     | `convertToRuntimeConfig` does it internally when raw data is passed as `initialValues` |
| **When to use**                 | Pure config-driven forms (e.g., `DynamicFormRenderer`) that don't need the raw response | Hybrid forms that need both mapped values AND the original response structure          |

**Why do some forms need the raw response?**

Config-driven forms (`DynamicFormRenderer`) only need flat `{ fieldName: value }` pairs — `fetchInitialValues` handles everything. But hybrid forms like `UpdateTicketForm` inject
**code-driven fallback options** using `withFallbackOptionFromSnowDataField()`, which needs the original nested ServiceNow structure (`{ display_value: "New", value: "1" }`). After
`fieldMapping` maps `{response:state.value}` to `"1"`, that nested structure is lost — so the raw response must be kept.

**The fieldMapping still works either way.** When you pass raw data as `initialValues` to `convertToRuntimeConfig`, it applies `fieldMapping` internally (line 624-626 in
`convert-to-runtime-config.ts`). The only difference is whether your calling code also has access to the raw response for code-driven behavior.

```
fetchInitialValues path:
  API -> raw response -> apply fieldMapping -> flat values (returned)

fetchRawInitialValues path:
  API -> raw response (returned as-is)
  └─ caller passes to convertToRuntimeConfig -> applies fieldMapping internally
  └─ caller also uses raw response for fallback options, etc.
```

### `getInitialValuesQueryKey(record)`

Returns the React Query cache key for the initial values fetch.

```typescript
import { getInitialValuesQueryKey } from '../utils/convert-to-runtime-config';

const queryKey = getInitialValuesQueryKey(record);
// Uses record.initialValuesConfig.queryKey if set, otherwise auto-generates from URL
```

### Conversion Steps (Internal)

1. `SerializableCondition` -> `FieldDependency` (operators -> functions)
2. `SerializableValidation` -> `FieldValidation` (string pattern -> RegExp)
3. `SerializableAsyncOptions` -> `AsyncOptionsConfig` (URL -> queryFn with GET/POST, param mapping, `{meta:key}`/`{field:key}` resolution, `{response:key}` in labelKey/valueKey)
4. `SerializableAsyncValidation` -> `AsyncFieldValidation` (URL -> validate function)
5. `SerializableSubmitConfig` -> `onSubmit` function (URL `{meta:key}` resolution, bodyMapping `{field:key}` resolution, `requestParams` template resolution, API call, cache
   invalidation)
6. `SerializableInitialValuesConfig` -> `fetchInitialValues()` (API call with `{meta:key}` URL resolution, response path, fieldMapping `{response:key}` resolution)
