import type { IssueWithoutKBArticle } from '@/shared/modules/atk-backend/types/knowledge-base';
import type { SnowTicketAssignmentFilterType, SnowTableName } from '../../../shared/modules/servicenow/types/ticket';

export type ServiceRequestState = {
    ticketSearchValue: string;
    ticketAssignmentFilter: SnowTicketAssignmentFilterType;
    ticketTypeFilter: SnowTableName;
    ticketStateFilter: string | null;
    ticketPriorityFilter: string | null;
    selectedTicketId: string | null;
    showTicketUpdateForm: boolean;
    showNoKbPrompt: boolean;
    kbArticleIssue: IssueWithoutKBArticle | null;
};

export type ServiceRequestAction =
    | { type: 'SET_TICKET_SEARCH_VALUE'; value: string }
    | { type: 'SELECT_TICKET'; ticketId: string }
    | { type: 'UNSELECT_TICKET' }
    | { type: 'CHANGE_TICKET_ASSIGNMENT_FILTER'; filter: SnowTicketAssignmentFilterType }
    | { type: 'CHANGE_TICKET_TYPE_FILTER'; ticketType: SnowTableName }
    | { type: 'BACK_TO_TICKET_LIST' }
    | { type: 'RESET_TICKET_SELECTION' }
    | { type: 'CHANGE_TICKET_STATE_AND_PRIORITY_FILTER'; stateFilter: string | null; priorityFilter: string | null }
    | { type: 'SHOW_NO_KB_PROMPT'; issue: IssueWithoutKBArticle }
    | { type: 'CONFIRM_GENERATE_KB_ARTICLE' }
    | { type: 'DISMISS_NO_KB_PROMPT' }
    | { type: 'CLOSE_KB_ARTICLE_MODAL' };

export const initialState: ServiceRequestState = {
    ticketSearchValue: '',
    ticketAssignmentFilter: 'assigned-to-user',
    ticketTypeFilter: 'sc_request',
    ticketStateFilter: null,
    ticketPriorityFilter: null,
    selectedTicketId: null,
    showTicketUpdateForm: false,
    showNoKbPrompt: false,
    kbArticleIssue: null,
};

export function serviceRequestReducer(state: ServiceRequestState, action: ServiceRequestAction): ServiceRequestState {
    switch (action.type) {
        case 'SET_TICKET_SEARCH_VALUE':
            return { ...state, ticketSearchValue: action.value, selectedTicketId: null, showTicketUpdateForm: false, ticketStateFilter: null, ticketPriorityFilter: null };
        case 'CHANGE_TICKET_STATE_AND_PRIORITY_FILTER':
            return {
                ...state,
                ticketStateFilter: action.stateFilter,
                ticketPriorityFilter: action.priorityFilter,
                selectedTicketId: null,
                showTicketUpdateForm: false,
            };
        case 'SELECT_TICKET':
            return { ...state, selectedTicketId: action.ticketId, showTicketUpdateForm: true };
        case 'UNSELECT_TICKET':
            return { ...state, selectedTicketId: null, showTicketUpdateForm: false };
        case 'CHANGE_TICKET_ASSIGNMENT_FILTER':
            return {
                ...state,
                ticketAssignmentFilter: action.filter,
                selectedTicketId: null,
                ticketSearchValue: '',
                ticketStateFilter: null,
                ticketPriorityFilter: null,
                showTicketUpdateForm: false,
            };
        case 'CHANGE_TICKET_TYPE_FILTER':
            return {
                ...state,
                ticketTypeFilter: action.ticketType,
                selectedTicketId: null,
                ticketSearchValue: '',
                ticketStateFilter: null,
                ticketPriorityFilter: null,
                showTicketUpdateForm: false,
            };
        case 'BACK_TO_TICKET_LIST':
            return { ...state, showTicketUpdateForm: false, selectedTicketId: null };
        case 'RESET_TICKET_SELECTION':
            return { ...state, selectedTicketId: null, showTicketUpdateForm: false };
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

export const setTicketSearchValue = (value: string): ServiceRequestAction => ({ type: 'SET_TICKET_SEARCH_VALUE', value });
export const selectTicket = (ticketId: string): ServiceRequestAction => ({ type: 'SELECT_TICKET', ticketId });
export const unselectTicket = (): ServiceRequestAction => ({ type: 'UNSELECT_TICKET' });
export const changeTicketAssignmentFilter = (filter: SnowTicketAssignmentFilterType): ServiceRequestAction => ({ type: 'CHANGE_TICKET_ASSIGNMENT_FILTER', filter });
export const changeTicketTypeFilter = (ticketType: SnowTableName): ServiceRequestAction => ({ type: 'CHANGE_TICKET_TYPE_FILTER', ticketType });
export const backToTicketList = (): ServiceRequestAction => ({ type: 'BACK_TO_TICKET_LIST' });
export const resetTicketSelection = (): ServiceRequestAction => ({ type: 'RESET_TICKET_SELECTION' });
export const changeTicketStateAndPriorityFilter = (stateFilter: string | null, priorityFilter: string | null): ServiceRequestAction => ({
    type: 'CHANGE_TICKET_STATE_AND_PRIORITY_FILTER',
    stateFilter,
    priorityFilter,
});
export const showNoKbPrompt = (issue: IssueWithoutKBArticle): ServiceRequestAction => ({ type: 'SHOW_NO_KB_PROMPT', issue });
export const confirmGenerateKbArticle = (): ServiceRequestAction => ({ type: 'CONFIRM_GENERATE_KB_ARTICLE' });
export const dismissNoKbPrompt = (): ServiceRequestAction => ({ type: 'DISMISS_NO_KB_PROMPT' });
export const closeKbArticleModal = (): ServiceRequestAction => ({ type: 'CLOSE_KB_ARTICLE_MODAL' });
