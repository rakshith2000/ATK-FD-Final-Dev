# ServiceNow Dynamic Form — Field Introspection Guide

Context: building a React `DynamicForm` (config-based, via `FormConfigRecord` / `convertToRuntimeConfig`) for creating/updating ServiceNow records like `incident` and `sc_task`,
and figuring out the full, correct list of fields + types to expose.

---

## 1. The Core Problem

ServiceNow tables use **inheritance**. `sys_dictionary` only stores fields _defined on the table you query_ — inherited fields live on the **parent** table's dictionary entries,
not duplicated onto every child table.

Querying `sys_dictionary?sysparm_query=name=incident` alone will **miss** every field inherited from `task` (e.g. `short_description`, `state`, `priority`, `assignment_group`,
`assigned_to`, `work_notes`, `due_date`, `cmdb_ci`, etc.).

### Table hierarchy discovered

```
            task   (root table)
           /    \
   incident      sc_task
```

- `incident` → `super_class = task`
- `sc_task` → `super_class = task`
- `task` → `super_class = ""` (root, stop)

Both are **siblings** extending `task` directly — not parent/child of each other. A custom table could add another level (e.g. `u_critical_incident → incident → task`), so always
walk the chain rather than assuming depth.

---

## 2. Walking the Hierarchy (`sys_db_object`)

`sys_db_object.super_class` stores only the **immediate** parent. Walk it in a loop until empty.

```http
GET /api/now/table/sys_db_object?sysparm_query=name=incident&sysparm_fields=super_class&sysparm_display_value=true
Authorization: Bearer <TOKEN>
Accept: application/json
```

→ `{ "result": [{ "super_class": "task" }] }`

```http
GET /api/now/table/sys_db_object?sysparm_query=name=task&sysparm_fields=super_class&sysparm_display_value=true
```

→ `{ "result": [{ "super_class": "" }] }` (root — stop)

Resulting chain: `['incident', 'task']`

### JS implementation

```js
async function getTableHierarchy(tableName) {
    const chain = [tableName];
    let current = tableName;
    while (true) {
        const res = await snowApi.get(`/api/now/table/sys_db_object`, {
            sysparm_query: `name=${current}`,
            sysparm_fields: 'super_class',
            sysparm_display_value: 'true',
        });
        const superClass = res.data.result[0]?.super_class;
        if (!superClass || chain.includes(superClass)) break; // stop at root or cycle guard
        chain.push(superClass);
        current = superClass;
    }
    return chain; // e.g. ['incident', 'task']
}
```

One HTTP call **per level** of the hierarchy.

---

## 3. Fetching All Fields Across the Chain (`sys_dictionary`)

Once you have the chain, one query gets every field:

```http
GET /api/now/table/sys_dictionary?sysparm_query=nameINincident,task^active=true&sysparm_fields=name,element,column_label,internal_type,mandatory,reference,max_length&sysparm_limit=1000
Authorization: Bearer <TOKEN>
Accept: application/json
```

> **Important:** include `name` in `sysparm_fields` — you need to know which table each row came from to de-dupe overridden fields correctly.

### JS implementation

```js
async function getAllFields(tableName) {
    const chain = await getTableHierarchy(tableName);
    const res = await snowApi.get(`/api/now/table/sys_dictionary`, {
        sysparm_query: `nameIN${chain.join(',')}^active=true`,
        sysparm_fields: 'name,element,column_label,internal_type,mandatory,reference,max_length',
        sysparm_limit: 1000,
    });
    // de-dupe by element, preferring the entry from the most-derived table (chain[0])
    const seen = new Map();
    for (const tableInChain of [...chain].reverse()) {
        for (const row of res.data.result.filter((r) => r.name === tableInChain)) {
            seen.set(row.element, row);
        }
    }
    return Array.from(seen.values());
}
```

Same pattern for `sc_task`: chain = `['sc_task', 'task']`, query = `nameINsc_task,task^active=true`.

---

## 4. Diagnosing "missing field" issues (e.g. `cmdb_ci`)

`cmdb_ci` appeared missing from `name=incident` queries because it's actually defined on **`task`**, not `incident`.

### Diagnostic checklist when a field seems missing

1. **Check the field on the parent table directly:**
    ```http
    GET /api/now/table/sys_dictionary?sysparm_query=name=task^element=cmdb_ci&sysparm_fields=element,column_label,internal_type,reference,active
    ```
2. **Check across the whole chain at once:**
    ```http
    GET /api/now/table/sys_dictionary?sysparm_query=nameINincident,task^element=cmdb_ci&sysparm_fields=name,element,column_label,internal_type,reference,active
    ```
3. **Check `active` flag** — deactivated fields won't show in forms/lists.
4. **Check pagination/limits** — `incident` + `task` combined can be 150–250+ rows; always set `sysparm_limit=1000` explicitly and compare against `X-Total-Count`.
5. **Check ACLs** — `sys_dictionary` read access (and field-level ACLs via `sys_security_acl`) can silently restrict rows per user/role. Cross-check against actual record data:
    ```http
    GET /api/now/table/incident?sysparm_limit=1&sysparm_display_value=all
    ```
    If a field is missing from the record response too, it's likely an ACL issue, not a dictionary gap.
6. **Check for renamed/custom fields** (e.g. `u_ci` instead of `cmdb_ci`) via:
    ```http
    GET /api/now/table/sys_dictionary?sysparm_query=element=cmdb_ci&sysparm_fields=name,element,column_label,internal_type,reference,active
    ```
    (no `name=` filter — shows every table that has this field, confirms it exists somewhere)

---

## 5. ServiceNow `internal_type` → DynamicForm `FieldType` Mapping

| ServiceNow `internal_type`           | DynamicForm `type` | Notes                                                                        |
| ------------------------------------ | ------------------ | ---------------------------------------------------------------------------- |
| `string`, `url`                      | `text`             |                                                                              |
| `journal`, `html`, `multi_line_text` | `textarea`         |                                                                              |
| `glide_date_time`, `glide_date`      | `date`             |                                                                              |
| `integer`, `decimal`, `float`        | `number`           |                                                                              |
| `boolean`                            | `checkbox`         |                                                                              |
| `choice`                             | `select`           | options from `sys_choice`                                                    |
| `reference`                          | `select`           | options via `asyncOptions` pointed at the referenced table (`row.reference`) |

### Choice field options lookup

```http
GET /api/now/table/sys_choice?sysparm_query=name=incident^element=state^inactive=false&sysparm_fields=label,value
```

---

## 6. Reusable TypeScript Utility

Full helper that walks the hierarchy, fetches deduped fields, and maps them to `SerializableFieldConfig`-ready shape.

```typescript
// utils/snow-field-introspection.ts

interface DictionaryRow {
    name: string;
    element: string;
    column_label: string;
    internal_type: string;
    mandatory: string;
    reference?: string;
    max_length?: string;
    active?: string;
}

interface MappedField {
    element: string;
    label: string;
    type: 'text' | 'textarea' | 'number' | 'checkbox' | 'date' | 'select';
    required: boolean;
    maxLength?: number;
    referenceTable?: string;
    asyncOptionsSuggestion?: {
        url: string;
        apiClient: 'service-now';
        labelKey: string;
        valueKey: string;
    };
}

export async function getTableHierarchy(snowGet: (path: string, params: Record<string, string>) => Promise<{ result: any[] }>, tableName: string): Promise<string[]> {
    const chain: string[] = [tableName];
    let current = tableName;

    while (true) {
        const res = await snowGet('/api/now/table/sys_db_object', {
            sysparm_query: `name=${current}`,
            sysparm_fields: 'super_class',
            sysparm_display_value: 'true',
        });
        const superClass = res.result[0]?.super_class;
        if (!superClass || chain.includes(superClass)) break;
        chain.push(superClass);
        current = superClass;
    }
    return chain;
}

export async function getDictionaryRows(
    snowGet: (path: string, params: Record<string, string>) => Promise<{ result: DictionaryRow[] }>,
    tableName: string,
    hierarchy?: string[],
): Promise<DictionaryRow[]> {
    const chain = hierarchy ?? [tableName];

    const res = await snowGet('/api/now/table/sys_dictionary', {
        sysparm_query: `nameIN${chain.join(',')}^active=true^elementISNOTEMPTY`,
        sysparm_fields: 'name,element,column_label,internal_type,mandatory,reference,max_length',
        sysparm_limit: '1000',
    });

    const seen = new Map<string, DictionaryRow>();
    for (const tableInChain of [...chain].reverse()) {
        for (const row of res.result.filter((r) => r.name === tableInChain)) {
            seen.set(row.element, row);
        }
    }
    return Array.from(seen.values());
}

function mapInternalType(row: DictionaryRow): MappedField['type'] {
    switch (row.internal_type) {
        case 'boolean':
            return 'checkbox';
        case 'integer':
        case 'decimal':
        case 'float':
            return 'number';
        case 'glide_date_time':
        case 'glide_date':
            return 'date';
        case 'choice':
        case 'reference':
            return 'select';
        case 'journal':
        case 'html':
        case 'multi_line_text':
            return 'textarea';
        default:
            return 'text';
    }
}

function buildAsyncOptionsSuggestion(row: DictionaryRow): MappedField['asyncOptionsSuggestion'] | undefined {
    if (row.internal_type === 'reference' && row.reference) {
        return {
            url: `/api/now/table/${row.reference}`,
            apiClient: 'service-now',
            labelKey: '{response:name}',
            valueKey: '{response:sys_id}',
        };
    }
    if (row.internal_type === 'choice') {
        return {
            url: '/api/now/table/sys_choice',
            apiClient: 'service-now',
            labelKey: '{response:label}',
            valueKey: '{response:value}',
        };
    }
    return undefined;
}

export function mapDictionaryRow(row: DictionaryRow): MappedField {
    return {
        element: row.element,
        label: row.column_label || row.element,
        type: mapInternalType(row),
        required: row.mandatory === 'true',
        maxLength: row.max_length ? Number(row.max_length) : undefined,
        referenceTable: row.reference,
        asyncOptionsSuggestion: buildAsyncOptionsSuggestion(row),
    };
}

export async function getAllFields(snowGet: (path: string, params: Record<string, string>) => Promise<{ result: any[] }>, tableName: string): Promise<MappedField[]> {
    const hierarchy = await getTableHierarchy(snowGet, tableName);
    const rows = await getDictionaryRows(snowGet, tableName, hierarchy);
    return rows.map(mapDictionaryRow).sort((a, b) => a.element.localeCompare(b.element));
}

export function toSerializableFieldConfig(field: MappedField): Record<string, unknown> {
    const base: Record<string, unknown> = {
        name: field.element,
        type: field.type,
        label: field.label,
        required: field.required,
    };
    if (field.type === 'text' || field.type === 'textarea') {
        base.validation = field.maxLength ? { maxLength: field.maxLength } : undefined;
    }
    if (field.asyncOptionsSuggestion) {
        base.asyncOptions = field.asyncOptionsSuggestion;
    }
    return base;
}
```

### Usage

```typescript
const fields = await getAllFields(snowGet, 'incident');
// fields[].element, .label, .type, .required, .referenceTable, .asyncOptionsSuggestion

const selectedConfigs = fields.filter((f) => userSelectedElements.includes(f.element)).map(toSerializableFieldConfig);

// selectedConfigs drops directly into FormConfigRecord.fields
```

### Known edge cases to handle

- **`labelKey` defaults aren't universal** for reference fields — `sys_user`/`sys_user_group` use `name`, but some custom reference tables use `u_name`/`display_name`. Keep a small
  override lookup table.
- **Choice fields need the `sys_choice` query injected per-field** at form-build time: `sysparm_query=name=<table>^element=<element>^inactive=false`.

---

## 7. Sample `FormConfigRecord` — Update SC Task

```json
{
    "id": "update-sc-task",
    "code": "update-sc-task",
    "name": "Update Catalog Task",
    "mode": "update",
    "metaFields": [
        { "key": "taskId", "type": "string", "description": "sc_task sys_id" },
        { "key": "tenantId", "type": "string" }
    ],
    "fields": [
        { "name": "short_description", "type": "text", "label": "Short Description", "required": true, "colSpan": 2 },
        {
            "name": "state",
            "type": "select",
            "label": "State",
            "required": true,
            "asyncOptions": {
                "url": "/api/now/table/sys_choice",
                "apiClient": "service-now",
                "labelKey": "{response:label}",
                "valueKey": "{response:value}",
                "requestParams": { "queryParams": { "sysparm_query": "name=sc_task^element=state^inactive=false" } }
            }
        },
        {
            "name": "assignment_group",
            "type": "select",
            "label": "Assignment Group",
            "asyncOptions": {
                "url": "/api/now/table/sys_user_group",
                "apiClient": "service-now",
                "labelKey": "{response:name}",
                "valueKey": "{response:sys_id}",
                "requestParams": { "queryParams": { "sysparm_query": "active=true" } }
            }
        },
        {
            "name": "assigned_to",
            "type": "select",
            "label": "Assigned To",
            "asyncOptions": {
                "url": "/api/now/table/sys_user_grmember",
                "apiClient": "service-now",
                "labelKey": "{response:user.name}",
                "valueKey": "{response:user.sys_id}",
                "dependsOn": "assignment_group",
                "requestParams": {
                    "queryParams": {
                        "sysparm_display_value": "all",
                        "sysparm_query": "group={field:assignment_group}"
                    }
                }
            }
        },
        { "name": "due_date", "type": "date", "label": "Due Date" },
        { "name": "work_notes", "type": "textarea", "label": "Work Notes", "colSpan": 2 }
    ],
    "submitConfig": {
        "url": "/api/now/table/sc_task/{meta:taskId}",
        "method": "PATCH",
        "apiClient": "service-now",
        "bodyMapping": {
            "short_description": "{field:short_description}",
            "state": "{field:state}",
            "assignment_group": "{field:assignment_group}",
            "assigned_to": "{field:assigned_to}",
            "due_date": "{field:due_date}",
            "work_notes": "{field:work_notes}"
        }
    },
    "initialValuesConfig": {
        "url": "/api/now/table/sc_task/{meta:taskId}",
        "apiClient": "service-now",
        "responsePath": "result",
        "fieldMapping": {
            "short_description": "{response:short_description}",
            "state": "{response:state.value}",
            "assignment_group": "{response:assignment_group.value}",
            "assigned_to": "{response:assigned_to.value}",
            "due_date": "{response:due_date}",
            "work_notes": "{response:work_notes}"
        }
    }
}
```

> **Reference field gotcha:** ServiceNow returns reference fields as `{ display_value, value }` objects unless display value handling is configured. `fieldMapping` should target
> `.value` (the sys_id) for select fields, not the display string, or the select won't match its options.

---

## 8. Full `.http` Reference File

```http
###############################################################################
# ServiceNow Table Hierarchy + Field Dictionary Introspection
###############################################################################

###############################################################################
# STEP 1: Walk the table hierarchy for INCIDENT
###############################################################################

# --- 1a. Start at the leaf table: incident ---
GET https://<instance>.service-now.com/api/now/table/sys_db_object?sysparm_query=name=incident&sysparm_fields=super_class&sysparm_display_value=true
Authorization: Bearer <TOKEN>
Accept: application/json

###

# --- 1b. Check the next level up: task (expect super_class = "", root) ---
GET https://<instance>.service-now.com/api/now/table/sys_db_object?sysparm_query=name=task&sysparm_fields=super_class&sysparm_display_value=true
Authorization: Bearer <TOKEN>
Accept: application/json

# Result: hierarchy chain = ['incident', 'task']

###############################################################################
# STEP 2: Fetch ALL dictionary fields across the full chain in ONE call
###############################################################################

GET https://<instance>.service-now.com/api/now/table/sys_dictionary?sysparm_query=nameINincident,task^active=true&sysparm_fields=name,element,column_label,internal_type,mandatory,reference,max_length&sysparm_limit=1000
Authorization: Bearer <TOKEN>
Accept: application/json

###############################################################################
# SAME PATTERN FOR SC_TASK
###############################################################################

GET https://<instance>.service-now.com/api/now/table/sys_db_object?sysparm_query=name=sc_task&sysparm_fields=super_class&sysparm_display_value=true
Authorization: Bearer <TOKEN>
Accept: application/json

###

GET https://<instance>.service-now.com/api/now/table/sys_dictionary?sysparm_query=nameINsc_task,task^active=true&sysparm_fields=name,element,column_label,internal_type,mandatory,reference,max_length&sysparm_limit=1000
Authorization: Bearer <TOKEN>
Accept: application/json

###############################################################################
# BONUS: Check a SPECIFIC field's dictionary entry across the whole chain
###############################################################################

GET https://<instance>.service-now.com/api/now/table/sys_dictionary?sysparm_query=nameINincident,task^element=cmdb_ci&sysparm_fields=name,element,column_label,internal_type,reference,active
Authorization: Bearer <TOKEN>
Accept: application/json

###############################################################################
# BONUS: Get choice options for a specific choice field
###############################################################################

GET https://<instance>.service-now.com/api/now/table/sys_choice?sysparm_query=name=incident^element=state^inactive=false&sysparm_fields=label,value
Authorization: Bearer <TOKEN>
Accept: application/json
```

> Use `###` on its own line (with blank lines around it) to separate requests in REST Client / VS Code so each gets its own "Send Request" link.

---

## 9. Key Takeaways

- `incident` and `sc_task` are **siblings**, both extending `task` directly.
- Always walk `sys_db_object.super_class` to build the full table chain before querying `sys_dictionary` — never assume a single-table query is complete.
- Use `nameIN<chain>` in `sys_dictionary` queries, include `name` in the response fields, and de-dupe by `element` (most-derived table wins on conflicts).
- Set `sysparm_limit=1000` explicitly; compare to `X-Total-Count` to rule out silent truncation.
- If a field still seems missing after checking the full chain, suspect ACLs (`sys_security_acl`) before assuming the field doesn't exist — verify by checking the actual record
  data endpoint, not just the dictionary.
- Map `internal_type` → form field type once, reuse everywhere; `reference` and `choice` types need `asyncOptions` wired to `sys_user_group`/etc. or `sys_choice` respectively.
