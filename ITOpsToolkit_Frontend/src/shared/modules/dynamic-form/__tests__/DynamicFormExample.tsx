/**
 * DynamicFormExample - demonstrates every field type, single & multi-field
 * visibleWhen / disabledWhen, static + conditional validation (both run together),
 * asyncOptions with single & multi dependsOn, asyncValidation, requiredWhen,
 * hidden fields, form modes (create/update/delete/view), initial values mapping,
 * submit with body mapping, and React Query invalidation.
 */
import { useState } from 'react';
import { DynamicForm } from '../index';
import type { FormConfig, FormMode, SelectOption } from '../types';
import logger from '@/shared/utils/logger';

//  Mock async helpers
const mockCategories: SelectOption[] = [
    { label: 'Engineering', value: 'engineering' },
    { label: 'Design', value: 'design' },
    { label: 'Marketing', value: 'marketing' },
];

const mockSubCategories: Record<string, SelectOption[]> = {
    engineering: [
        { label: 'Frontend', value: 'frontend' },
        { label: 'Backend', value: 'backend' },
        { label: 'DevOps', value: 'devops' },
    ],
    design: [
        { label: 'UI Design', value: 'ui-design' },
        { label: 'UX Research', value: 'ux-research' },
    ],
    marketing: [
        { label: 'Content', value: 'content' },
        { label: 'SEO', value: 'seo' },
    ],
};

const mockRegions: SelectOption[] = [
    { label: 'US East', value: 'us-east' },
    { label: 'US West', value: 'us-west' },
    { label: 'EU', value: 'eu' },
];

function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchCategories(): Promise<SelectOption[]> {
    await delay(800);
    return mockCategories;
}

async function fetchSubCategories(category?: unknown): Promise<SelectOption[]> {
    await delay(600);
    if (!category || typeof category !== 'string') return [];
    return mockSubCategories[category] ?? [];
}

async function fetchTeams(deps?: unknown): Promise<SelectOption[]> {
    await delay(600);
    const [category, region] = (deps as unknown[]) ?? [];
    if (!category || !region) return [];
    return [
        { label: `${String(category)}-${String(region)}-alpha`, value: `${String(category)}-${String(region)}-alpha` },
        { label: `${String(category)}-${String(region)}-beta`, value: `${String(category)}-${String(region)}-beta` },
    ];
}

async function checkSlugUnique(value: unknown): Promise<string | undefined> {
    await delay(500);
    if (value === 'existing-slug') return 'This slug is already taken';
    return undefined;
}

/**
 * Mock data simulating an API like https://jsonplaceholder.typicode.com/users
 * The response is a flat array (no wrapper), each item has nested objects.
 * We use mapResponse to extract { label: name, value: id } from this shape.
 */
const MOCK_USERS_API_RESPONSE = [
    { id: 1, name: 'Leanne Graham', username: 'Bret', email: 'Sincere@april.biz', company: { name: 'Romaguera-Crona' } },
    { id: 2, name: 'Ervin Howell', username: 'Antonette', email: 'Shanna@melissa.tv', company: { name: 'Deckow-Crist' } },
    { id: 3, name: 'Clementine Bauch', username: 'Samantha', email: 'Nathan@yesenia.net', company: { name: 'Romaguera-Jacobson' } },
    { id: 4, name: 'Patricia Lebsack', username: 'Karianne', email: 'Julianne.OConner@kory.org', company: { name: 'Robel-Corkery' } },
    { id: 5, name: 'Chelsey Dietrich', username: 'Kamren', email: 'Lucio_Hettinger@annie.ca', company: { name: 'Keebler LLC' } },
    { id: 6, name: 'Mrs. Dennis Schulist', username: 'Leopoldo_Corkery', email: 'Karley_Dach@jasper.info', company: { name: 'Considine-Lockman' } },
    { id: 7, name: 'Kurtis Weissnat', username: 'Elwyn.Skiles', email: 'Telly.Hoeger@billy.biz', company: { name: 'Johns Group' } },
    { id: 8, name: 'Nicholas Runolfsdottir V', username: 'Maxime_Nienow', email: 'Sherwood@rosamond.me', company: { name: 'Abernathy Group' } },
    { id: 9, name: 'Glenna Reichert', username: 'Delphine', email: 'Chaim_McDermott@dana.io', company: { name: 'Yost and Sons' } },
    { id: 10, name: 'Clementina DuBuque', username: 'Moriah.Stanton', email: 'Rey.Padberg@karina.biz', company: { name: 'Hoeger LLC' } },
];

/** Simulate fetching users from /api/users (returns the flat array above) */
async function fetchUsers(): Promise<SelectOption[]> {
    await delay(700);
    // This simulates what mapResponse does: extract label/value from each item
    return MOCK_USERS_API_RESPONSE.map((u) => ({ label: `${u.name} (${u.email})`, value: String(u.id) }));
}

/** Simulate server-side search (searchable example) */
async function searchUsers(_depVal?: unknown, searchTerm?: string): Promise<SelectOption[]> {
    await delay(500);
    const all = MOCK_USERS_API_RESPONSE.map((u) => ({ label: `${u.name} (${u.company.name})`, value: String(u.id) }));
    if (!searchTerm?.trim()) return all.slice(0, 5); // empty search = limited results
    const lower = searchTerm.toLowerCase();
    return all.filter((o) => o.label.toLowerCase().includes(lower));
}

/** Simulate fetching users filtered by company (dependsOn example) */
async function fetchUsersByCategory(category?: unknown): Promise<SelectOption[]> {
    await delay(500);
    if (!category || typeof category !== 'string') return MOCK_USERS_API_RESPONSE.map((u) => ({ label: u.name, value: String(u.id) }));
    // Filter by some mapping: engineering -> ids 1-4, design -> ids 5-7, marketing -> ids 8-10
    const categoryMap: Record<string, number[]> = { engineering: [1, 2, 3, 4], design: [5, 6, 7], marketing: [8, 9, 10] };
    const ids = categoryMap[category] ?? [];
    return MOCK_USERS_API_RESPONSE.filter((u) => ids.includes(u.id)).map((u) => ({ label: u.name, value: String(u.id) }));
}

//  Simulated API data (as if fetched from /api/items/:id)
const MOCK_API_RESPONSE = {
    data: {
        record: {
            item_title: 'Sample Title',
            item_slug: 'sample-slug',
            item_password: 'SamplePass1',
            item_description: 'This is a sample description for testing.',
            item_priority: 3,
            is_active: true,
            category_code: 'engineering',
            sub_categories: ['frontend', 'backend'],
            region_code: 'us-east',
            start_date: '2026-01-15',
            date_range: ['2026-01-01', '2026-06-30'],
            budget_range: [10000, 50000],
            // API returns separate name fields - we'll combine them into "ownerDisplayName"
            owner_first: 'John',
            owner_last: 'Doe',
        },
    },
};

/**
 * Simulates mapping API response fields to form field names.
 *
 *  Field Combinations (initial values - inbound)
 *   API returns separate "owner_first" + "owner_last"
 *   -> combined into form field "ownerDisplayName" = "John Doe"
 *   Config equivalent (serializable):
 *     initialValuesConfig.fieldCombinations: [
 *       { targetKey: "ownerDisplayName", sourceFields: ["owner_first", "owner_last"],
 *         template: "{owner_first} {owner_last}" }
 *     ]
 *
 *  Field Mapping (key rename)
 *   API "item_title" -> form "title", "category_code" -> "category", etc.
 */
function mapApiResponseToFormValues(apiData: Record<string, unknown>): Record<string, unknown> {
    // 1. Field combinations: combine API fields -> single form field
    const combined = { ...apiData };
    const first = combined.owner_first ?? '';
    const last = combined.owner_last ?? '';
    combined.ownerDisplayName = `${first} ${last}`.trim();
    delete combined.owner_first;
    delete combined.owner_last;

    // 2. Field mapping: rename API keys -> form field names
    const fieldMapping: Record<string, string> = {
        item_title: 'title',
        item_slug: 'slug',
        item_password: 'password',
        item_description: 'description',
        item_priority: 'priority',
        is_active: 'isActive',
        category_code: 'category',
        sub_categories: 'subCategories',
        region_code: 'region',
        start_date: 'startDate',
        date_range: 'dateRange',
        budget_range: 'budgetRange',
    };
    const mapped: Record<string, unknown> = {};
    for (const [apiKey, value] of Object.entries(combined)) {
        const formKey = fieldMapping[apiKey] ?? apiKey;
        mapped[formKey] = value;
    }
    return mapped;
}

/**
 * Simulates mapping form values to API request body.
 *
 *  Field Combinations (submit - outbound)
 *   Form has "category" + "region" -> combine into "search_scope" = "engineering/us-east"
 *   Config equivalent (serializable):
 *     submitConfig.fieldCombinations: [
 *       { targetKey: "search_scope", sourceFields: ["category", "region"],
 *         separator: "/", removeSourceFields: false }
 *     ]
 *
 *  Body Mapping (key rename)
 *   Form "title" -> API "item_title", "category" -> "category_code", etc.
 */
function mapFormValuesToRequestBody(formValues: Record<string, unknown>): Record<string, unknown> {
    // 1. Field combinations: combine form fields -> single API field
    const combined = { ...formValues };
    if (combined.category && combined.region) {
        combined.search_scope = `${combined.category}/${combined.region}`;
        // removeSourceFields: false - they still map individually too
    }

    // 2. Body mapping: rename form keys -> API keys
    const bodyMapping: Record<string, string> = {
        title: 'item_title',
        slug: 'item_slug',
        password: 'item_password',
        description: 'item_description',
        priority: 'item_priority',
        isActive: 'is_active',
        category: 'category_code',
        subCategories: 'sub_categories',
        region: 'region_code',
        startDate: 'start_date',
        dateRange: 'date_range',
        budgetRange: 'budget_range',
    };
    const mapped: Record<string, unknown> = {};
    for (const [formKey, value] of Object.entries(combined)) {
        const apiKey = bodyMapping[formKey] ?? formKey;
        mapped[apiKey] = value;
    }
    return mapped;
}

//  Form config builder
function buildExampleConfig(mode: FormMode): FormConfig {
    // For update/delete/view: simulate fetching initial values from API and mapping them
    const initialValues = mode !== 'create' ? mapApiResponseToFormValues(MOCK_API_RESPONSE.data.record) : undefined;

    return {
        mode,
        trackDirty: mode === 'create' || mode === 'update',
        onDirtyChange: (isDirty) => logger.debug('Dirty:', isDirty),
        submitLabel: mode === 'delete' ? 'Delete Item' : mode === 'update' ? 'Update Item' : 'Create Item',
        submittingLabel: mode === 'delete' ? 'Deleting...' : 'Saving...',
        initialValues,
        fields: [
            //  Basic fields
            {
                name: 'title',
                type: 'text',
                label: 'Title',
                required: true,
                colSpan: 1,
                placeholder: 'Enter a title',
                // Static validation with custom messages
                validation: {
                    minLength: 3,
                    minLengthMessage: 'Title must be at least 3 characters',
                    maxLength: 100,
                    maxLengthMessage: 'Title cannot exceed 100 characters',
                },
            },
            {
                name: 'slug',
                type: 'text',
                label: 'Slug',
                required: true,
                colSpan: 1,
                placeholder: 'e.g. my-item',
                disabled: mode === 'update',
                validation: { pattern: /^[a-z0-9-]+$/, patternMessage: 'Slug can only contain lowercase letters, numbers, and hyphens' },
                asyncValidation: {
                    debounceMs: 400,
                    validate: checkSlugUnique,
                },
            },
            {
                name: 'password',
                type: 'password',
                label: 'Password',
                // requiredWhen: only required in create mode (when slug is not disabled)
                requiredWhen: {
                    field: 'slug',
                    condition: (_val: unknown) => mode === 'create',
                },
                colSpan: 1,
                placeholder: 'Enter password',
                // Static validation with custom messages
                validation: {
                    minLength: 8,
                    minLengthMessage: 'Password must be at least 8 characters',
                    maxLength: 64,
                    maxLengthMessage: 'Password is too long',
                },
                // Conditional: stronger pattern when isActive, with custom message
                conditionalValidation: [
                    {
                        when: {
                            field: 'isActive',
                            condition: (val: unknown) => val === true,
                        },
                        rules: {
                            pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).+$/,
                            patternMessage: 'Active accounts require uppercase, lowercase, number, and special character',
                        },
                    },
                ],
            },
            {
                name: 'description',
                type: 'textarea',
                label: 'Description',
                colSpan: 2,
                placeholder: 'Describe the item...',
                // Static: always enforce max
                validation: { maxLength: 500 },
                // Conditional: when priority > 5 also enforce a minimum
                conditionalValidation: [
                    {
                        when: {
                            field: 'priority',
                            condition: (val: unknown) => typeof val === 'number' && val > 5,
                        },
                        rules: { minLength: 30 },
                    },
                ],
            },
            {
                name: 'priority',
                type: 'number',
                label: 'Priority',
                colSpan: 1,
                placeholder: '1-10',
                validation: { min: 1, minMessage: 'Priority must be at least 1', max: 10, maxMessage: 'Priority cannot exceed 10' },
            },
            {
                name: 'isActive',
                type: 'checkbox',
                label: 'Active',
                colSpan: 1,
            },

            //  Combined field: API's owner_first + owner_last -> ownerDisplayName
            //  Shows how fieldCombinations on initialValuesConfig populates this
            {
                name: 'ownerDisplayName',
                type: 'text',
                label: 'Owner (Combined)',
                colSpan: 1,
                placeholder: 'Auto-filled from API (first + last name)',
                disabled: mode !== 'create',
            },

            //  Hidden field (never rendered, but value included in submit)
            {
                name: 'internalRef',
                type: 'text',
                label: 'Internal Reference',
                hidden: true,
                defaultValue: 'auto-generated-ref-001',
            },

            //  Single-field visibleWhen + asyncOptions with single dependsOn
            {
                name: 'category',
                type: 'select',
                label: 'Category',
                required: true,
                colSpan: 1,
                placeholder: 'Select category...',
                asyncOptions: {
                    queryKey: () => ['example', 'categories'],
                    queryFn: fetchCategories,
                },
                onChange: (_value, formApi) => {
                    const api = formApi as { setFieldValue: (name: string, value: unknown) => void };
                    api.setFieldValue('subCategories', []);
                    api.setFieldValue('team', '');
                },
            },
            {
                name: 'subCategories',
                type: 'multiselect',
                label: 'Sub-Categories',
                colSpan: 1,
                placeholder: 'Select sub-categories...',
                asyncOptions: {
                    queryKey: (depVal) => ['example', 'sub-categories', depVal],
                    queryFn: fetchSubCategories,
                    dependsOn: 'category',
                },
                visibleWhen: {
                    field: 'category',
                    condition: (val: unknown) => !!val && val !== '',
                },
            },

            //  asyncOptions with queryFn - fetches all users, maps to { label, value }
            {
                name: 'owner',
                type: 'select',
                label: 'Owner',
                colSpan: 1,
                placeholder: 'Select owner...',
                asyncOptions: {
                    queryKey: () => ['example', 'users'],
                    queryFn: fetchUsers,
                },
            },

            //  searchable asyncOptions - server-side search (fetches on open + on typing)
            {
                name: 'collaborator',
                type: 'select',
                label: 'Collaborator (Server Search)',
                colSpan: 1,
                placeholder: 'Type to search users...',
                asyncOptions: {
                    queryKey: () => ['example', 'users-search'],
                    queryFn: searchUsers,
                    searchable: true,
                    searchDebounceMs: 400,
                },
            },

            //  asyncOptions with dependsOn - users filtered by selected category
            {
                name: 'assignee',
                type: 'select',
                label: 'Assignee',
                colSpan: 1,
                placeholder: 'Select assignee...',
                asyncOptions: {
                    queryKey: (depVal) => ['example', 'users-by-category', depVal],
                    queryFn: fetchUsersByCategory,
                    dependsOn: 'category',
                },
                visibleWhen: {
                    field: 'category',
                    condition: (val: unknown) => !!val && val !== '',
                },
            },

            /**
             *  URL-based asyncOptions with mapResponse
             *
             * How this works for config-driven forms (form builder):
             *   API: GET /api/users -> returns array of user objects (like jsonplaceholder)
             *   Config:
             *     url: "/api/users"
             *     responsePath: undefined      (response IS the array, no nesting)
             *     labelKey: "name"             (each item's "name" -> option label)
             *     valueKey: "id"               (each item's "id" -> option value)
             *
             * For nested responses (e.g. { data: { results: [...] } }):
             *     responsePath: "data.results" (dig into response to find the array)
             *
             * For runtime (code-driven) forms, use mapResponse for full control:
             */
            {
                name: 'reviewer',
                type: 'select',
                label: 'Reviewer',
                colSpan: 1,
                placeholder: 'Select reviewer...',
                asyncOptions: {
                    url: '/api/users',
                    mapResponse: (data) => {
                        // data = the raw API response (array of user objects)
                        const users = data as { id: number; name: string; email: string; company: { name: string } }[];
                        return users.map((u) => ({
                            label: `${u.name} - ${u.company.name}`,
                            value: String(u.id),
                        }));
                    },
                },
            },

            //  Region + multi dependsOn asyncOptions
            {
                name: 'region',
                type: 'select',
                label: 'Region',
                colSpan: 1,
                placeholder: 'Select region...',
                options: mockRegions,
            },
            {
                name: 'team',
                type: 'select',
                label: 'Team',
                colSpan: 1,
                placeholder: 'Pick category & region first...',
                asyncOptions: {
                    queryKey: (deps) => ['example', 'teams', ...(deps as unknown[])],
                    queryFn: fetchTeams,
                    dependsOn: ['category', 'region'],
                },
                visibleWhen: {
                    fields: ['category', 'region'],
                    condition: (allValues: Record<string, unknown>) => !!allValues.category && allValues.category !== '' && !!allValues.region && allValues.region !== '',
                },
            },

            //  Date fields
            {
                name: 'startDate',
                type: 'date',
                label: 'Start Date',
                colSpan: 1,
            },
            {
                name: 'dateRange',
                type: 'date-range',
                label: 'Date Range',
                colSpan: 1,
            },

            //  Number range field with static + conditional validation
            {
                name: 'budgetRange',
                type: 'number-range',
                label: 'Budget Range ($)',
                colSpan: 1,
                placeholder: 'Min - Max budget',
                // Static: always constrained
                validation: { min: 0, max: 1000000 },
                // Conditional: when category = engineering, tighter max
                conditionalValidation: [
                    {
                        when: {
                            field: 'category',
                            condition: (val: unknown) => val === 'engineering',
                        },
                        rules: { max: 500000 },
                    },
                ],
            },

            //  Multi-field visibleWhen + conditional validation
            {
                name: 'notes',
                type: 'textarea',
                label: 'Internal Notes',
                colSpan: 2,
                placeholder: 'Visible when category = engineering AND priority > 5',
                visibleWhen: {
                    fields: ['category', 'priority'],
                    condition: (allValues: Record<string, unknown>) => allValues.category === 'engineering' && typeof allValues.priority === 'number' && allValues.priority > 5,
                },
                // Static: always enforce maxLength
                validation: { maxLength: 500 },
                // Conditional: stricter rules at higher priority
                conditionalValidation: [
                    {
                        when: {
                            field: 'priority',
                            condition: (val: unknown) => typeof val === 'number' && val >= 8,
                        },
                        rules: { minLength: 20 },
                    },
                ],
            },

            //  Multi-field disabledWhen
            {
                name: 'lockedField',
                type: 'text',
                label: 'Locked When Inactive or Low Priority',
                colSpan: 2,
                placeholder: 'Disabled when isActive=false OR priority < 3',
                disabledWhen: {
                    fields: ['isActive', 'priority'],
                    condition: (allValues: Record<string, unknown>) => !allValues.isActive || (typeof allValues.priority === 'number' && allValues.priority < 3),
                },
            },
        ],
        onSubmit: async (values) => {
            // Map form values -> API body format (includes field combinations + key renaming)
            const requestBody = mapFormValuesToRequestBody(values);
            logger.debug(`[${mode.toUpperCase()}] Request body:`, requestBody);
            // Note: requestBody now includes "search_scope" = "engineering/us-east"
            // combined from category + region (removeSourceFields: false, so both still present)

            await delay(1500);

            const httpMethod = {
                create: 'POST /api/items',
                update: 'PUT /api/items/:id',
                delete: 'DELETE /api/items/:id',
                view: 'N/A',
            }[mode];
            logger.debug(`API call: ${httpMethod}`, requestBody);
            logger.debug('Would invalidate query key: ["items"]');

            return { message: `Item ${mode}d successfully!` };
        },
        onSubmitSuccess: async (_values, message) => {
            logger.debug('Success:', message);
            // Refresh data - in real app: queryClient.invalidateQueries({ queryKey: ['items'] });
        },
    };
}

//  Example Page

const DynamicFormExample: React.FC = () => {
    const [mode, setMode] = useState<FormMode>('create');
    const config = buildExampleConfig(mode);

    return (
        <div className="flex flex-col">
            {/* Mode switcher */}
            <div className="flex gap-2 p-4 border-b border-gray-200">
                {(['create', 'update', 'delete', 'view'] as FormMode[]).map((m) => (
                    <button
                        key={m}
                        type="button"
                        onClick={() => setMode(m)}
                        className={`px-3 py-1 text-xs rounded ${mode === m ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                        {m}
                    </button>
                ))}
            </div>

            {/* Mode info */}
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-[11px] text-gray-500 space-y-0.5">
                <div>
                    <strong>Mode:</strong> {mode} | <strong>HTTP:</strong> {mode === 'create' ? 'POST' : mode === 'update' ? 'PUT' : mode === 'delete' ? 'DELETE' : 'GET'} |{' '}
                    <strong>Invalidates:</strong> ["items"]
                </div>
                <div>
                    <strong>Initial Values:</strong> {mode !== 'create' ? 'owner_first + owner_last -> ownerDisplayName (fieldCombination)' : 'None (defaults)'} |{' '}
                    <strong>Submit:</strong> category + region - search_scope (fieldCombination, removeSourceFields: false)
                </div>
            </div>

            {/* Form */}
            <div className="flex-1 min-h-0 shadow max-w-200 p-4 justify-center items-center">
                <DynamicForm key={mode} config={config} formId="DynamicFormExample" />
            </div>
        </div>
    );
};

export default DynamicFormExample;
