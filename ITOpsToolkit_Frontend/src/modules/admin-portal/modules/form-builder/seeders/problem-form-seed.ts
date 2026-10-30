import type { FormConfigRecord } from '../types/form-config';

const problemFormSeed: FormConfigRecord = {
    id: '2',
    version: 1,
    code: 'Problem Form',
    name: 'Problem Form',
    description: 'ServiceNow Problem update form',
    mode: 'update',
    fields: [
        {
            name: 'state',
            type: 'select',
            label: 'State',
            required: true,
            placeholder: 'Select state',
            asyncOptions: {
                url: '/api/now/table/sys_choice',
                responsePath: 'result',
                labelKey: '{response:label}',
                valueKey: '{response:value}',
                initialOptionLabelKey: '{initialValue:state.display_value}',
                initialOptionValueKey: '{initialValue:state.value}',
                queryKey: ['ticketStateChoiceQuery', '{meta:ticketType}'],
                apiClient: 'service-now',
                requestParams: {
                    queryParams: { sysparm_query: 'name={meta:ticketType}^element=state', sysparm_fields: 'label,value,sys_id' },
                },
            },
            onChangeEffects: [
                {
                    setField: 'close_code',
                    setValue: 'Solved (Permanently)',
                    when: { field: 'state', operator: 'in', value: ['106', '107'] },
                },
            ],
        },
        {
            name: 'priority',
            type: 'select',
            label: 'Priority',
            required: true,
            placeholder: 'Priority',
            disabled: true,
            options: [
                { label: '1 - Critical', value: '1' },
                { label: '2 - High', value: '2' },
                { label: '3 - Moderate', value: '3' },
                { label: '4 - Low', value: '4' },
                { label: '5 - Planning', value: '5' },
            ],
        },
        {
            name: 'assignment_group',
            type: 'select',
            label: 'Assignment Group',
            required: true,
            placeholder: 'Select Assignment Group',
            asyncOptions: {
                url: '/api/now/table/sys_user_group',
                responsePath: 'result',
                labelKey: '{response:name}',
                valueKey: '{response:sys_id}',
                initialOptionLabelKey: '{initialValue:assignment_group.display_value}',
                initialOptionValueKey: '{initialValue:assignment_group.value}',
                queryKey: ['ticketAssignmentGroupChoiceQuery'],
                apiClient: 'service-now',
                searchable: true,
                searchDebounceMs: 300,
                searchQueryKey: 'sysparm_query',
                searchQueryParam: 'active=true^nameLIKE{searchTerm}',
                requestParams: {
                    queryParams: { sysparm_fields: 'name,sys_id', sysparm_limit: '20' },
                },
            },
            onChangeEffects: [{ setField: 'assigned_to', setValue: '' }],
        },
        {
            name: 'urgency',
            type: 'select',
            label: 'Urgency',
            required: true,
            options: [
                { label: '1 - High', value: '1' },
                { label: '2 - Medium', value: '2' },
                { label: '3 - Low', value: '3' },
            ],
            onChangeEffects: [
                {
                    setField: 'priority',
                    setValue: '1',
                    when: {
                        join: 'and',
                        conditions: [
                            { field: 'urgency', operator: 'equals', value: '1' },
                            { field: 'impact', operator: 'equals', value: '1' },
                        ],
                    },
                },
                {
                    setField: 'priority',
                    setValue: '2',
                    when: {
                        join: 'and',
                        conditions: [
                            { field: 'urgency', operator: 'equals', value: '1' },
                            { field: 'impact', operator: 'equals', value: '2' },
                        ],
                    },
                },
                {
                    setField: 'priority',
                    setValue: '3',
                    when: {
                        join: 'and',
                        conditions: [
                            { field: 'urgency', operator: 'equals', value: '1' },
                            { field: 'impact', operator: 'equals', value: '3' },
                        ],
                    },
                },
                {
                    setField: 'priority',
                    setValue: '2',
                    when: {
                        join: 'and',
                        conditions: [
                            { field: 'urgency', operator: 'equals', value: '2' },
                            { field: 'impact', operator: 'equals', value: '1' },
                        ],
                    },
                },
                {
                    setField: 'priority',
                    setValue: '3',
                    when: {
                        join: 'and',
                        conditions: [
                            { field: 'urgency', operator: 'equals', value: '2' },
                            { field: 'impact', operator: 'equals', value: '2' },
                        ],
                    },
                },
                {
                    setField: 'priority',
                    setValue: '4',
                    when: {
                        join: 'and',
                        conditions: [
                            { field: 'urgency', operator: 'equals', value: '2' },
                            { field: 'impact', operator: 'equals', value: '3' },
                        ],
                    },
                },
                {
                    setField: 'priority',
                    setValue: '2',
                    when: {
                        join: 'and',
                        conditions: [
                            { field: 'urgency', operator: 'equals', value: '3' },
                            { field: 'impact', operator: 'equals', value: '1' },
                        ],
                    },
                },
                {
                    setField: 'priority',
                    setValue: '3',
                    when: {
                        join: 'and',
                        conditions: [
                            { field: 'urgency', operator: 'equals', value: '3' },
                            { field: 'impact', operator: 'equals', value: '2' },
                        ],
                    },
                },
                {
                    setField: 'priority',
                    setValue: '4',
                    when: {
                        join: 'and',
                        conditions: [
                            { field: 'urgency', operator: 'equals', value: '3' },
                            { field: 'impact', operator: 'equals', value: '3' },
                        ],
                    },
                },
            ],
        },
        {
            name: 'assigned_to',
            type: 'select',
            label: 'Assigned To',
            required: true,
            placeholder: 'Assigned To',
            asyncOptions: {
                url: '/api/now/table/sys_user_grmember',
                responsePath: 'result',
                labelKey: '{response:user.display_value}',
                valueKey: '{response:user.value}',
                initialOptionLabelKey: '{initialValue:assigned_to.display_value}',
                initialOptionValueKey: '{initialValue:assigned_to.value}',
                dependsOn: 'assignment_group',
                queryKey: ['ticketAssignedToChoiceQuery'],
                apiClient: 'service-now',
                searchable: true,
                searchDebounceMs: 300,
                searchQueryKey: 'sysparm_query',
                searchQueryParam: 'group={field:assignment_group}^user.nameLIKE{searchTerm}',
                requestParams: {
                    queryParams: {
                        sysparm_display_value: 'all',
                        sysparm_fields: 'user,sys_id',
                        sysparm_limit: '20',
                    },
                },
            },
        },
        {
            name: 'impact',
            type: 'select',
            label: 'Impact',
            required: true,
            options: [
                { label: '1 - High', value: '1' },
                { label: '2 - Medium', value: '2' },
                { label: '3 - Low', value: '3' },
            ],
            onChangeEffects: [
                {
                    setField: 'priority',
                    setValue: '1',
                    when: {
                        join: 'and',
                        conditions: [
                            { field: 'urgency', operator: 'equals', value: '1' },
                            { field: 'impact', operator: 'equals', value: '1' },
                        ],
                    },
                },
                {
                    setField: 'priority',
                    setValue: '2',
                    when: {
                        join: 'and',
                        conditions: [
                            { field: 'urgency', operator: 'equals', value: '1' },
                            { field: 'impact', operator: 'equals', value: '2' },
                        ],
                    },
                },
                {
                    setField: 'priority',
                    setValue: '3',
                    when: {
                        join: 'and',
                        conditions: [
                            { field: 'urgency', operator: 'equals', value: '1' },
                            { field: 'impact', operator: 'equals', value: '3' },
                        ],
                    },
                },
                {
                    setField: 'priority',
                    setValue: '2',
                    when: {
                        join: 'and',
                        conditions: [
                            { field: 'urgency', operator: 'equals', value: '2' },
                            { field: 'impact', operator: 'equals', value: '1' },
                        ],
                    },
                },
                {
                    setField: 'priority',
                    setValue: '3',
                    when: {
                        join: 'and',
                        conditions: [
                            { field: 'urgency', operator: 'equals', value: '2' },
                            { field: 'impact', operator: 'equals', value: '2' },
                        ],
                    },
                },
                {
                    setField: 'priority',
                    setValue: '4',
                    when: {
                        join: 'and',
                        conditions: [
                            { field: 'urgency', operator: 'equals', value: '2' },
                            { field: 'impact', operator: 'equals', value: '3' },
                        ],
                    },
                },
                {
                    setField: 'priority',
                    setValue: '2',
                    when: {
                        join: 'and',
                        conditions: [
                            { field: 'urgency', operator: 'equals', value: '3' },
                            { field: 'impact', operator: 'equals', value: '1' },
                        ],
                    },
                },
                {
                    setField: 'priority',
                    setValue: '3',
                    when: {
                        join: 'and',
                        conditions: [
                            { field: 'urgency', operator: 'equals', value: '3' },
                            { field: 'impact', operator: 'equals', value: '2' },
                        ],
                    },
                },
                {
                    setField: 'priority',
                    setValue: '4',
                    when: {
                        join: 'and',
                        conditions: [
                            { field: 'urgency', operator: 'equals', value: '3' },
                            { field: 'impact', operator: 'equals', value: '3' },
                        ],
                    },
                },
            ],
        },
        {
            name: 'short_description',
            type: 'textarea',
            label: 'Short Description',
            colSpan: 2,
            placeholder: 'Short Description',
            textAreaRows: 2,
        },
        {
            name: 'cmdb_ci',
            type: 'select',
            label: 'Configuration Item',
            placeholder: 'Search Configuration Item...',
            colSpan: 2,
            asyncOptions: {
                url: '/api/now/table/cmdb_ci',
                responsePath: 'result',
                labelKey: '{response:name}',
                valueKey: '{response:sys_id}',
                initialOptionLabelKey: '{initialValue:cmdb_ci.display_value}',
                initialOptionValueKey: '{initialValue:cmdb_ci.value}',
                queryKey: ['ticketCmdbCiSearchQuery'],
                apiClient: 'service-now',
                searchable: true,
                searchDebounceMs: 300,
                searchQueryKey: 'sysparm_query',
                searchQueryParam: 'nameLIKE{searchTerm}',
                requestParams: {
                    queryParams: {
                        sysparm_limit: '20',
                    },
                },
            },
        },
        {
            name: 'description',
            type: 'textarea',
            label: 'Description',
            colSpan: 2,
            placeholder: 'Description',
            textAreaRows: 5,
        },
        {
            name: 'comments',
            type: 'textarea',
            label: 'Additional comments',
            colSpan: 2,
            placeholder: 'Additional comments...',
            textAreaRows: 5,
        },
        {
            name: 'work_notes',
            type: 'textarea',
            label: 'Work notes',
            colSpan: 2,
            placeholder: 'Work notes...',
            textAreaRows: 5,
        },
        {
            name: 'close_notes',
            type: 'textarea',
            label: 'Resolution Notes',
            colSpan: 2,
            placeholder: 'Resolution Notes',
            visibleWhen: { field: 'state', operator: 'in', value: ['106', '107'] },
            requiredWhen: { field: 'state', operator: 'in', value: ['106', '107'] },
            textAreaRows: 10,
        },
        {
            name: 'close_code',
            type: 'select',
            label: 'Closure Code',
            placeholder: 'Closure Code',
            colSpan: 2,
            options: [{ label: 'Solved (Permanently)', value: 'Solved (Permanently)' }],
            visibleWhen: { field: 'state', operator: 'in', value: ['106', '107'] },
            requiredWhen: { field: 'state', operator: 'in', value: ['106', '107'] },
        },
    ],
    submitLabel: 'Update Problem',
    submittingLabel: 'Updating Problem...',
    trackDirty: true,
    submitWithValues: 'changed-only',
    submitGuards: ['no-changes'],
    submitGuardMessages: { noChangesMessage: 'No Changes are made to the problem to update !', noChangesTitle: 'No Changes Found !' },
    variant: 'standard',
    submitConfig: {
        url: '/api/now/table/{meta:ticketType}/{meta:ticketId}',
        method: 'PATCH',
        apiClient: 'service-now',
        bodyMapping: {
            state: '{field:state}',
            priority: '{field:priority}',
            assignment_group: '{field:assignment_group}',
            urgency: '{field:urgency}',
            assigned_to: '{field:assigned_to}',
            impact: '{field:impact}',
            short_description: '{field:short_description}',
            cmdb_ci: '{field:cmdb_ci}',
            description: '{field:description}',
            comments: '{field:comments}',
            work_notes: '{field:work_notes}',
            close_notes: '{field:close_notes}',
            close_code: '{field:close_code}',
        },
        requestParams: {
            queryParams: { sysparm_display_value: 'all' },
        },
    },
    initialValuesConfig: {
        url: '/api/now/table/{meta:ticketType}/{meta:ticketId}',
        method: 'GET',
        apiClient: 'service-now',
        responsePath: 'result',
        requestParams: {
            queryParams: { sysparm_display_value: 'all' },
        },
        fieldMapping: {
            state: '{response:state.value}',
            priority: '{response:priority.value}',
            assignment_group: '{response:assignment_group.value}',
            urgency: '{response:urgency.value}',
            assigned_to: '{response:assigned_to.value}',
            impact: '{response:impact.value}',
            short_description: '{response:short_description.value}',
            cmdb_ci: '{response:cmdb_ci.value}',
            description: '{response:description.value}',
            comments: '{response:comments.value}',
            work_notes: '{response:work_notes.value}',
            close_notes: '{response:close_notes.value}',
            close_code: '{response:close_code.value}',
        },
    },
    metaFields: [
        { key: 'ticketId', type: 'string', description: 'ServiceNow ticket sys_id' },
        { key: 'ticketType', type: 'string', description: 'ServiceNow ticket type (problem_task, etc.)' },
    ],
    created_by: 'form-admin',
    updated_by: 'form-admin',
    created_at: '2026-06-11T10:00:00Z',
    updated_at: new Date().toUTCString(),
    formType: 'servicenow',
    snowDictName: 'problem',
};

export default problemFormSeed;
