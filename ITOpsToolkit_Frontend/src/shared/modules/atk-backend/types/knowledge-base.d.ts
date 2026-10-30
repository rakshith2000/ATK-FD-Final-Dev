import type z from 'zod';
import type { KbArticleAIScoringSchema } from '../schemas/knowledge-base.schema';

export interface IssueWithoutKBArticle {
    short_description: string;
    comments: string;
    assignment_group: string;
    cmdb_ci: string;
    description: string;
    priority: string;
    close_notes: string;
    sys_id: string;
    number: string;
    'cmdb_ci.sys_id': string;
    sys_created_on: string;
    caller_id: string;
    location: string;
    state: string;
    category: string;
    work_notes: string;
    sys_created_by: string;
    assigned_to: string;
    ticket_link: string;
}

export interface GenerateKBArticleRequest {
    short_description: string;
    resolution_notes: string;
    description: string;
    work_notes_and_comments: string;
}

export interface GenerateKBArticleResponse {
    title: string;
    generated_article: string;
}

export type KBArticleScoringResponse = z.infer<typeof KbArticleAIScoringSchema>;

export interface KBArticleScoringRequest {
    KBNumber: string;
    KBContent: string;
    getScoreBy: 'number' | 'content';
}
