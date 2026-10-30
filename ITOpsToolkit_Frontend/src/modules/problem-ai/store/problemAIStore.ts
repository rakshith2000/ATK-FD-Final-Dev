import type { IssueWithoutKBArticle } from '@/shared/modules/atk-backend/types/knowledge-base';
import type { SnowTicketAssignmentFilterType } from '@/shared/modules/servicenow/types/ticket';

export type ProblemAIState = {
    ticketSearchValue: string;
    ticketAssignmentFilter: SnowTicketAssignmentFilterType;
    ticketPriorityFilter: string | null;
    ticketStateFilter: string | null;
    selectedTicketId: string | null;
    showTicketUpdateForm: boolean;
    showNoKbPrompt: boolean;
    kbArticleIssue: IssueWithoutKBArticle | null;
};

export type ProblemAIAction =
    | { type: 'SET_TICKET_SEARCH_VALUE'; value: string }
    | { type: 'SELECT_TICKET'; ticketId: string }
    | { type: 'UNSELECT_TICKET' }
    | { type: 'CHANGE_TICKET_ASSIGNMENT_FILTER'; filter: SnowTicketAssignmentFilterType }
    | { type: 'CHANGE_TICKET_PRIORITY_FILTER'; value: string | null }
    | { type: 'CHANGE_TICKET_STATE_AND_PRIORITY_FILTER'; stateFilter: string | null; priorityFilter: string | null }
    | { type: 'BACK_TO_TICKET_LIST' }
    | { type: 'RESET_TICKET_SELECTION' }
    | { type: 'CHANGE_TICKET_STATE_FILTER'; value: string | null }
    | { type: 'SHOW_NO_KB_PROMPT'; issue: IssueWithoutKBArticle }
    | { type: 'CONFIRM_GENERATE_KB_ARTICLE' }
    | { type: 'DISMISS_NO_KB_PROMPT' }
    | { type: 'CLOSE_KB_ARTICLE_MODAL' };

export const initialState: ProblemAIState = {
    ticketSearchValue: '',
    ticketAssignmentFilter: 'assigned-to-user',
    ticketStateFilter: null,
    selectedTicketId: null,
    showTicketUpdateForm: false,
    showNoKbPrompt: false,
    kbArticleIssue: null,
    ticketPriorityFilter: null,
};

export function problemAIReducer(state: ProblemAIState, action: ProblemAIAction): ProblemAIState {
    switch (action.type) {
        case 'SET_TICKET_SEARCH_VALUE':
            return {
                ...state,
                ticketSearchValue: action.value,
                selectedTicketId: null,
                showTicketUpdateForm: false,
                ticketStateFilter: null,
                ticketPriorityFilter: null,
            };
        case 'CHANGE_TICKET_STATE_FILTER':
            return { ...state, ticketStateFilter: action.value, selectedTicketId: null, ticketSearchValue: '', showTicketUpdateForm: false };
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
                ticketPriorityFilter: null,
                ticketStateFilter: null,
                showTicketUpdateForm: false,
            };

        case 'CHANGE_TICKET_PRIORITY_FILTER':
            return { ...state, ticketPriorityFilter: action.value, selectedTicketId: null, showTicketUpdateForm: false };
        case 'CHANGE_TICKET_STATE_AND_PRIORITY_FILTER':
            return {
                ...state,
                ticketStateFilter: action.stateFilter,
                ticketPriorityFilter: action.priorityFilter,
                selectedTicketId: null,
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

export const setTicketSearchValue = (value: string): ProblemAIAction => ({ type: 'SET_TICKET_SEARCH_VALUE', value });
export const selectTicket = (ticketId: string): ProblemAIAction => ({ type: 'SELECT_TICKET', ticketId });
export const unselectTicket = (): ProblemAIAction => ({ type: 'UNSELECT_TICKET' });
export const changeTicketAssignmentFilter = (filter: SnowTicketAssignmentFilterType): ProblemAIAction => ({ type: 'CHANGE_TICKET_ASSIGNMENT_FILTER', filter });
export const backToTicketList = (): ProblemAIAction => ({ type: 'BACK_TO_TICKET_LIST' });
export const resetTicketSelection = (): ProblemAIAction => ({ type: 'RESET_TICKET_SELECTION' });
export const changeTicketStateFilter = (value: string | null): ProblemAIAction => ({ type: 'CHANGE_TICKET_STATE_FILTER', value });
export const showNoKbPrompt = (issue: IssueWithoutKBArticle): ProblemAIAction => ({ type: 'SHOW_NO_KB_PROMPT', issue });
export const confirmGenerateKbArticle = (): ProblemAIAction => ({ type: 'CONFIRM_GENERATE_KB_ARTICLE' });
export const dismissNoKbPrompt = (): ProblemAIAction => ({ type: 'DISMISS_NO_KB_PROMPT' });
export const closeKbArticleModal = (): ProblemAIAction => ({ type: 'CLOSE_KB_ARTICLE_MODAL' });
export const changeTicketStateAndPriorityFilter = (stateFilter: string | null, priorityFilter: string | null): ProblemAIAction => ({
    type: 'CHANGE_TICKET_STATE_AND_PRIORITY_FILTER',
    stateFilter,
    priorityFilter,
});
export const changeTicketPriorityFilter = (value: string | null): ProblemAIAction => ({ type: 'CHANGE_TICKET_PRIORITY_FILTER', value });
