import type { IssueWithoutKBArticle } from '@/shared/modules/atk-backend/types/knowledge-base';
import type { SnowTicketAssignmentFilterType } from '@/shared/modules/servicenow/types/ticket';
import logger from '@/shared/utils/logger';

export type IncidentAIState = {
    incidentSearchValue: string;
    incidentAssignmentFilter: SnowTicketAssignmentFilterType;
    incidentStateFilter: string | null;
    incidentPriorityFilter: string | null;
    incidentAssignmentGroupFilter: string | null;
    selectedIncidentId: string | null;
    showIncidentUpdateForm: boolean;
    showNoKbPrompt: boolean;
    kbArticleIssue: IssueWithoutKBArticle | null;
};

export type IncidentAIAction =
    | { type: 'SET_INCIDENT_SEARCH_VALUE'; value: string }
    | { type: 'SELECT_INCIDENT'; incidentId: string }
    | { type: 'UNSELECT_INCIDENT' }
    | { type: 'CHANGE_INCIDENT_ASSIGNMENT_FILTER'; filter: SnowTicketAssignmentFilterType }
    | { type: 'BACK_TO_INCIDENT_LIST' }
    | { type: 'RESET_INCIDENT_SELECTION' }
    | { type: 'CHANGE_INCIDENT_STATE_FILTER'; value: string | null }
    | { type: 'CHANGE_INCIDENT_PRIORITY_FILTER'; value: string | null }
    | { type: 'CHANGE_INCIDENT_STATE_PRIORITY_AND_ASSIGNMENT_GROUP_FILTER'; stateFilter: string | null; priorityFilter: string | null; assignmentGroupFilter: string | null }
    | { type: 'SHOW_NO_KB_PROMPT'; issue: IssueWithoutKBArticle }
    | { type: 'CONFIRM_GENERATE_KB_ARTICLE' }
    | { type: 'DISMISS_NO_KB_PROMPT' }
    | { type: 'CLOSE_KB_ARTICLE_MODAL' };

export const initialState: IncidentAIState = {
    incidentSearchValue: '',
    incidentAssignmentFilter: 'assigned-to-user',
    incidentStateFilter: null,
    incidentPriorityFilter: null,
    incidentAssignmentGroupFilter: null,
    selectedIncidentId: null,
    showIncidentUpdateForm: false,
    showNoKbPrompt: false,
    kbArticleIssue: null,
};

export function incidentAIReducer(state: IncidentAIState, action: IncidentAIAction): IncidentAIState {
    logger.debug({ action });

    switch (action.type) {
        case 'SET_INCIDENT_SEARCH_VALUE':
            return {
                ...state,
                incidentSearchValue: action.value,
                selectedIncidentId: null,
                showIncidentUpdateForm: false,
                incidentStateFilter: null,
                incidentPriorityFilter: null,
                incidentAssignmentGroupFilter: null,
            };
        case 'CHANGE_INCIDENT_STATE_FILTER':
            return { ...state, incidentStateFilter: action.value, selectedIncidentId: null, showIncidentUpdateForm: false };
        case 'CHANGE_INCIDENT_PRIORITY_FILTER':
            return { ...state, incidentPriorityFilter: action.value, selectedIncidentId: null, showIncidentUpdateForm: false };
        case 'CHANGE_INCIDENT_STATE_PRIORITY_AND_ASSIGNMENT_GROUP_FILTER':
            return {
                ...state,
                incidentStateFilter: action.stateFilter,
                incidentPriorityFilter: action.priorityFilter,
                incidentAssignmentGroupFilter: action.assignmentGroupFilter,
                selectedIncidentId: null,
                showIncidentUpdateForm: false,
            };
        case 'SELECT_INCIDENT':
            return { ...state, selectedIncidentId: action.incidentId, showIncidentUpdateForm: true };
        case 'UNSELECT_INCIDENT':
            return { ...state, selectedIncidentId: null, showIncidentUpdateForm: false };
        case 'CHANGE_INCIDENT_ASSIGNMENT_FILTER':
            return {
                ...state,
                incidentAssignmentFilter: action.filter,
                selectedIncidentId: null,
                incidentSearchValue: '',
                incidentStateFilter: null,
                incidentPriorityFilter: null,
                incidentAssignmentGroupFilter: null,
                showIncidentUpdateForm: false,
            };
        case 'BACK_TO_INCIDENT_LIST':
            return { ...state, showIncidentUpdateForm: false, selectedIncidentId: null };
        case 'RESET_INCIDENT_SELECTION':
            return { ...state, selectedIncidentId: null, showIncidentUpdateForm: false };
        case 'SHOW_NO_KB_PROMPT':
            return { ...state, showNoKbPrompt: true, kbArticleIssue: action.issue };
        case 'CONFIRM_GENERATE_KB_ARTICLE':
            return { ...state, showNoKbPrompt: false };
        case 'DISMISS_NO_KB_PROMPT':
            return { ...state, showNoKbPrompt: false, kbArticleIssue: null };
        case 'CLOSE_KB_ARTICLE_MODAL':
            return { ...state, kbArticleIssue: null };
        default:
            return state;
    }
}

export const setIncidentSearchValue = (value: string): IncidentAIAction => ({ type: 'SET_INCIDENT_SEARCH_VALUE', value });
export const selectIncident = (incidentId: string): IncidentAIAction => ({ type: 'SELECT_INCIDENT', incidentId });
export const unselectIncident = (): IncidentAIAction => ({ type: 'UNSELECT_INCIDENT' });
export const changeIncidentAssignmentFilter = (filter: SnowTicketAssignmentFilterType): IncidentAIAction => ({ type: 'CHANGE_INCIDENT_ASSIGNMENT_FILTER', filter });
export const backToIncidentList = (): IncidentAIAction => ({ type: 'BACK_TO_INCIDENT_LIST' });
export const resetIncidentSelection = (): IncidentAIAction => ({ type: 'RESET_INCIDENT_SELECTION' });
export const changeIncidentStateFilter = (value: string | null): IncidentAIAction => ({ type: 'CHANGE_INCIDENT_STATE_FILTER', value });
export const changeIncidentPriorityFilter = (value: string | null): IncidentAIAction => ({ type: 'CHANGE_INCIDENT_PRIORITY_FILTER', value });
export const changeIncidentStatePriorityAndAssignmentGroupFilter = (
    stateFilter: string | null,
    priorityFilter: string | null,
    assignmentGroupFilter: string | null = null,
): IncidentAIAction => ({
    type: 'CHANGE_INCIDENT_STATE_PRIORITY_AND_ASSIGNMENT_GROUP_FILTER',
    stateFilter,
    priorityFilter,
    assignmentGroupFilter,
});
export const showNoKbPrompt = (issue: IssueWithoutKBArticle): IncidentAIAction => ({ type: 'SHOW_NO_KB_PROMPT', issue });
export const confirmGenerateKbArticle = (): IncidentAIAction => ({ type: 'CONFIRM_GENERATE_KB_ARTICLE' });
export const dismissNoKbPrompt = (): IncidentAIAction => ({ type: 'DISMISS_NO_KB_PROMPT' });
export const closeKbArticleModal = (): IncidentAIAction => ({ type: 'CLOSE_KB_ARTICLE_MODAL' });
