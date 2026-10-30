/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import { getApiClient, appendSearchParamToUrl } from '../useFieldOptions';
import serviceNowApiClient from '@/api/axios-clients/service-now-api/service-now-api-client';
import backendApiClient from '@/api/axios-clients/backend-api/backend-api-client';
import { convertToRuntimeConfig } from '@/modules/admin-portal/modules/form-builder/utils/convert-to-runtime-config';

describe('Dynamic Form Option Search Helpers', () => {
    describe('getApiClient', () => {
        it('should return serviceNowApiClient for service-now type', () => {
            expect(getApiClient('service-now')).toBe(serviceNowApiClient);
        });

        it('should return backendApiClient for backend type or undefined', () => {
            expect(getApiClient('backend')).toBe(backendApiClient);
            expect(getApiClient()).toBe(backendApiClient);
        });
    });

    describe('appendSearchParamToUrl', () => {
        it('should append a brand new search parameter with equals separator for non-ServiceNow client', () => {
            const url = '/api/options?active=true';
            const searchParam = 'search=admin';
            const result = appendSearchParamToUrl(url, searchParam, '&');
            expect(result).toBe('/api/options?active=true&search=admin');
        });

        it('should append search term to ServiceNow sysparm_query parameter when none exists', () => {
            const url = '/api/options?active=true';
            const searchParam = 'nameLIKEadmin';
            const result = appendSearchParamToUrl(url, searchParam, '^');
            // Since active=true exists as a query parameter (not sysparm_query), nameLIKEadmin is set as sysparm_query
            expect(result).toBe('/api/options?active=true&sysparm_query=nameLIKEadmin');
        });

        it('should merge search term with existing ServiceNow sysparm_query using ^ separator', () => {
            const url = '/api/options?sysparm_query=active=true';
            const searchParam = 'nameLIKEadmin';
            const result = appendSearchParamToUrl(url, searchParam, '^');
            // sysparm_query should be merged: sysparm_query=active=true^nameLIKEadmin
            // URLSearchParams stringification will encode the equals and caret in the query value
            expect(result).toBe('/api/options?sysparm_query=active%3Dtrue%5EnameLIKEadmin');
        });

        it('should merge key-value search parameter if key already exists using custom separator', () => {
            const url = '/api/options?sysparm_query=active=true';
            const searchParam = 'sysparm_query=nameLIKEadmin';
            const result = appendSearchParamToUrl(url, searchParam, '^');
            expect(result).toBe('/api/options?sysparm_query=active%3Dtrue%5EnameLIKEadmin');
        });

        it('should preserve absolute protocol URLs', () => {
            const url = 'https://example.com/api/options?sysparm_query=active=true';
            const searchParam = 'nameLIKEadmin';
            const result = appendSearchParamToUrl(url, searchParam, '^');
            expect(result).toBe('https://example.com/api/options?sysparm_query=active%3Dtrue%5EnameLIKEadmin');
        });
    });
});

describe('convertToRuntimeConfig - Fallback options injection', () => {
    it('should inject fallback options automatically from raw initial values for async select fields', () => {
        const record = {
            id: 'test-form',
            code: 'test-form',
            name: 'Test Form',
            mode: 'update',
            fields: [
                {
                    name: 'assignment_group',
                    type: 'select',
                    label: 'Assignment Group',
                    asyncOptions: {
                        url: '/api/now/table/sys_user_group',
                        apiClient: 'service-now',
                    },
                },
            ],
            initialValuesConfig: {
                url: '/api/now/table/incident',
                apiClient: 'service-now',
                fieldMapping: {
                    assignment_group: '{response:assignment_group.value}',
                },
            },
            submitConfig: {
                url: '/api/now/table/incident',
                method: 'PATCH',
                apiClient: 'service-now',
                bodyMapping: {},
            },
        };

        const rawInitialValues = {
            assignment_group: {
                display_value: 'Network Group',
                value: 'sys_id_123',
            },
        };

        // We can cast record as any to bypass TypeScript typing checks in raw/serialized test structure
        const runtimeConfig = convertToRuntimeConfig(record as any, {
            mode: 'update',
            initialValues: rawInitialValues,
        });

        const field = runtimeConfig.fields.find((f: any) => f.name === 'assignment_group');
        expect(field).toBeDefined();
        expect(field?.options).toEqual([{ label: 'Network Group', value: 'sys_id_123' }]);
        expect(runtimeConfig.initialValues?.assignment_group).toBe('sys_id_123');
    });

    it('should inject fallback options automatically when initialValues has non-enumerable _rawInitialValues property', () => {
        const record = {
            id: 'test-form-2',
            code: 'test-form-2',
            name: 'Test Form 2',
            mode: 'update',
            fields: [
                {
                    name: 'assignment_group',
                    type: 'select',
                    label: 'Assignment Group',
                    asyncOptions: {
                        url: '/api/now/table/sys_user_group',
                        apiClient: 'service-now',
                    },
                },
            ],
            initialValuesConfig: {
                url: '/api/now/table/incident',
                apiClient: 'service-now',
                fieldMapping: {
                    assignment_group: '{response:assignment_group.value}',
                },
            },
            submitConfig: {
                url: '/api/now/table/incident',
                method: 'PATCH',
                apiClient: 'service-now',
                bodyMapping: {},
            },
        };

        const rawInitialValues = {
            assignment_group: {
                display_value: 'Network Group',
                value: 'sys_id_123',
            },
        };

        // Simulate fetchInitialValues return value structure
        const mappedValues = {
            assignment_group: 'sys_id_123',
        };
        Object.defineProperty(mappedValues, '_rawInitialValues', {
            value: rawInitialValues,
            enumerable: false,
            writable: true,
            configurable: true,
        });

        const runtimeConfig = convertToRuntimeConfig(record as any, {
            mode: 'update',
            initialValues: mappedValues,
        });

        const field = runtimeConfig.fields.find((f: any) => f.name === 'assignment_group');
        expect(field).toBeDefined();
        expect(field?.options).toEqual([{ label: 'Network Group', value: 'sys_id_123' }]);
        expect(runtimeConfig.initialValues?.assignment_group).toBe('sys_id_123');
    });

    it('should inject fallback options using generic template-based labelKey and valueKey for custom non-ServiceNow API responses', () => {
        const record = {
            id: 'test-form-3',
            code: 'test-form-3',
            name: 'Test Form 3',
            mode: 'update',
            fields: [
                {
                    name: 'custom_field',
                    type: 'select',
                    label: 'Custom Field',
                    asyncOptions: {
                        url: '/api/custom-items',
                        apiClient: 'backend',
                        labelKey: '{response:title}',
                        valueKey: '{response:code}',
                    },
                },
            ],
            initialValuesConfig: {
                url: '/api/custom-item/detail',
                apiClient: 'backend',
                fieldMapping: {
                    custom_field: '{response:custom_field.code}',
                },
            },
            submitConfig: {
                url: '/api/custom-item/detail',
                method: 'PATCH',
                apiClient: 'backend',
                bodyMapping: {},
            },
        };

        const rawInitialValues = {
            custom_field: {
                title: 'My Custom Label',
                code: 'custom_code_abc',
            },
        };

        const runtimeConfig = convertToRuntimeConfig(record as any, {
            mode: 'update',
            initialValues: rawInitialValues,
        });

        const field = runtimeConfig.fields.find((f: any) => f.name === 'custom_field');
        expect(field).toBeDefined();
        expect(field?.options).toEqual([{ label: 'My Custom Label', value: 'custom_code_abc' }]);
        expect(runtimeConfig.initialValues?.custom_field).toBe('custom_code_abc');
    });

    it('should inject fallback options using explicit initialOptionLabelKey and initialOptionValueKey mappings', () => {
        const record = {
            id: 'test-form-4',
            code: 'test-form-4',
            name: 'Test Form 4',
            mode: 'update',
            fields: [
                {
                    name: 'custom_field',
                    type: 'select',
                    label: 'Custom Field',
                    asyncOptions: {
                        url: '/api/custom-items',
                        apiClient: 'backend',
                        initialOptionLabelKey: '{initialValue:custom_field.display_name}',
                        initialOptionValueKey: '{initialValue:custom_field.key_id}',
                    },
                },
            ],
            initialValuesConfig: {
                url: '/api/custom-item/detail',
                apiClient: 'backend',
                fieldMapping: {
                    custom_field: '{response:custom_field.key_id}',
                },
            },
            submitConfig: {
                url: '/api/custom-item/detail',
                method: 'PATCH',
                apiClient: 'backend',
                bodyMapping: {},
            },
        };

        const rawInitialValues = {
            custom_field: {
                display_name: 'Explicit Mapping Label',
                key_id: 'custom_val_123',
            },
        };

        const runtimeConfig = convertToRuntimeConfig(record as any, {
            mode: 'update',
            initialValues: rawInitialValues,
        });

        const field = runtimeConfig.fields.find((f: any) => f.name === 'custom_field');
        expect(field).toBeDefined();
        expect(field?.options).toEqual([{ label: 'Explicit Mapping Label', value: 'custom_val_123' }]);
        expect(runtimeConfig.initialValues?.custom_field).toBe('custom_val_123');
    });

    it('should split and pair options correctly for ServiceNow glide_list fields returning comma-separated values', () => {
        const record = {
            id: 'test-form-glide-list',
            code: 'test-form-glide-list',
            name: 'Test Form Glide List',
            mode: 'update',
            fields: [
                {
                    name: 'watch_list',
                    type: 'multiselect',
                    label: 'Watch List',
                    asyncOptions: {
                        url: '/api/now/table/sys_user',
                        apiClient: 'service-now',
                    },
                },
            ],
            initialValuesConfig: {
                url: '/api/now/table/incident',
                apiClient: 'service-now',
                fieldMapping: {
                    watch_list: '{response:watch_list.value}',
                },
            },
            submitConfig: {
                url: '/api/now/table/incident',
                method: 'PATCH',
                apiClient: 'service-now',
                bodyMapping: {},
            },
        };

        const rawInitialValues = {
            watch_list: {
                display_value: 'John Doe, Jane Smith, Bob Johnson',
                value: 'user_1,user_2,user_3',
            },
        };

        const runtimeConfig = convertToRuntimeConfig(record as any, {
            mode: 'update',
            initialValues: rawInitialValues,
        });

        const field = runtimeConfig.fields.find((f: any) => f.name === 'watch_list');
        expect(field).toBeDefined();
        expect(field?.options).toEqual([
            { label: 'John Doe', value: 'user_1' },
            { label: 'Jane Smith', value: 'user_2' },
            { label: 'Bob Johnson', value: 'user_3' },
        ]);
        expect(runtimeConfig.initialValues?.watch_list).toBe('user_1,user_2,user_3');
    });

    it('should split and pair options correctly using explicit mappings for custom multi-select lists', () => {
        const record = {
            id: 'test-form-custom-list',
            code: 'test-form-custom-list',
            name: 'Test Form Custom List',
            mode: 'update',
            fields: [
                {
                    name: 'additional_assignee',
                    type: 'multiselect',
                    label: 'Additional Assignee',
                    asyncOptions: {
                        url: '/api/users',
                        apiClient: 'backend',
                        initialOptionLabelKey: '{initialValue:assignees_labels}',
                        initialOptionValueKey: '{initialValue:assignees_ids}',
                    },
                },
            ],
            initialValuesConfig: {
                url: '/api/ticket/detail',
                apiClient: 'backend',
                fieldMapping: {
                    additional_assignee: '{response:assignees_ids}',
                },
            },
            submitConfig: {
                url: '/api/ticket/detail',
                method: 'PATCH',
                apiClient: 'backend',
                bodyMapping: {},
            },
        };

        const rawInitialValues = {
            assignees_labels: 'Alice Green, Charlie Brown',
            assignees_ids: 'user_abc,user_xyz',
        };

        const runtimeConfig = convertToRuntimeConfig(record as any, {
            mode: 'update',
            initialValues: rawInitialValues,
        });

        const field = runtimeConfig.fields.find((f: any) => f.name === 'additional_assignee');
        expect(field).toBeDefined();
        expect(field?.options).toEqual([
            { label: 'Alice Green', value: 'user_abc' },
            { label: 'Charlie Brown', value: 'user_xyz' },
        ]);
        expect(runtimeConfig.initialValues?.additional_assignee).toBe('user_abc,user_xyz');
    });

    it('should map fallback options correctly when rawInitialValues is an array of objects', () => {
        const record = {
            id: 'test-form-array-objects',
            code: 'test-form-array-objects',
            name: 'Test Form Array Objects',
            mode: 'update',
            fields: [
                {
                    name: 'watch_list',
                    type: 'multiselect',
                    label: 'Watch List',
                    asyncOptions: {
                        url: '/api/users',
                        apiClient: 'backend',
                        labelKey: '{response:name}',
                        valueKey: '{response:id}',
                    },
                },
            ],
            initialValuesConfig: {
                url: '/api/incident/detail',
                apiClient: 'backend',
                fieldMapping: {
                    watch_list: '{response:watch_list}',
                },
            },
            submitConfig: {
                url: '/api/incident/detail',
                method: 'PATCH',
                apiClient: 'backend',
                bodyMapping: {},
            },
        };

        const rawInitialValues = {
            watch_list: [
                { id: 'user_1', name: 'John Doe' },
                { id: 'user_2', name: 'Jane Smith' },
            ],
        };

        const runtimeConfig = convertToRuntimeConfig(record as any, {
            mode: 'update',
            initialValues: rawInitialValues,
        });

        const field = runtimeConfig.fields.find((f: any) => f.name === 'watch_list');
        expect(field).toBeDefined();
        expect(field?.options).toEqual([
            { label: 'John Doe', value: 'user_1' },
            { label: 'Jane Smith', value: 'user_2' },
        ]);
    });

    it('should map fallback options correctly when rawInitialValues is an array of primitives', () => {
        const record = {
            id: 'test-form-array-primitives',
            code: 'test-form-array-primitives',
            name: 'Test Form Array Primitives',
            mode: 'update',
            fields: [
                {
                    name: 'watch_list',
                    type: 'multiselect',
                    label: 'Watch List',
                    asyncOptions: {
                        url: '/api/tags',
                        apiClient: 'backend',
                    },
                },
            ],
            initialValuesConfig: {
                url: '/api/incident/detail',
                apiClient: 'backend',
                fieldMapping: {
                    watch_list: '{response:watch_list}',
                },
            },
            submitConfig: {
                url: '/api/incident/detail',
                method: 'PATCH',
                apiClient: 'backend',
                bodyMapping: {},
            },
        };

        const rawInitialValues = {
            watch_list: ['tag_1', 'tag_2'],
        };

        const runtimeConfig = convertToRuntimeConfig(record as any, {
            mode: 'update',
            initialValues: rawInitialValues,
        });

        const field = runtimeConfig.fields.find((f: any) => f.name === 'watch_list');
        expect(field).toBeDefined();
        expect(field?.options).toEqual([
            { label: 'tag_1', value: 'tag_1' },
            { label: 'tag_2', value: 'tag_2' },
        ]);
    });

    it('should map fallback options using meta prefix variables when response contains no label information', () => {
        const record = {
            id: 'test-form-meta-fallback',
            code: 'test-form-meta-fallback',
            name: 'Test Form Meta Fallback',
            mode: 'update',
            fields: [
                {
                    name: 'author_id',
                    type: 'select',
                    label: 'Author',
                    asyncOptions: {
                        url: '/api/users',
                        apiClient: 'backend',
                        initialOptionLabelKey: '{meta:author_label}',
                        initialOptionValueKey: '{meta:author_value}',
                    },
                },
            ],
            initialValuesConfig: {
                url: '/api/posts/1',
                apiClient: 'backend',
                fieldMapping: {
                    author_id: '{response:userId}',
                },
            },
            submitConfig: {
                url: '/api/posts/1',
                method: 'PATCH',
                apiClient: 'backend',
                bodyMapping: {},
            },
        };

        const rawInitialValues = {
            userId: 1,
        };

        const runtimeConfig = convertToRuntimeConfig(record as any, {
            mode: 'update',
            initialValues: rawInitialValues,
            meta: {
                author_label: 'Leanne Graham',
                author_value: '1',
            },
        });

        const field = runtimeConfig.fields.find((f: any) => f.name === 'author_id');
        expect(field).toBeDefined();
        expect(field?.options).toEqual([{ label: 'Leanne Graham', value: '1' }]);
        expect(runtimeConfig.initialValues?.author_id).toBe('1');
    });
});
