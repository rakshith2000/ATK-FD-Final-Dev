import type { DisplayValue, KnowledgeArticle_From_List_API } from '../types';

/** Deterministic PRNG (mulberry32) - same seed always yields the same article. */
const createRandom = (seed: number) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const dv = (value: string, displayValue?: string): DisplayValue => ({
    value,
    display_value: displayValue ?? value,
});

const KNOWLEDGE_BASES = ['IT Knowledge', 'Network Operations', 'Application Support', 'Database Services'];
const CATEGORIES = ['Troubleshooting', 'How To', 'Known Error', 'Runbook', 'FAQ'];
const WORKFLOW_STATES = ['published', 'draft', 'review', 'retired'];
const AUTHORS = ['Priya Raman', 'Marcus Webb', 'Ana Sokolova', 'Devon Clarke', 'Hiroshi Tanaka'];
const TOPICS = [
    'Resolving high CPU utilization on application servers',
    'Recovering a failed nightly batch job',
    'Clearing stuck messages in the integration queue',
    'Remediating disk space alerts on /var/log',
    'Restarting the payment gateway service safely',
    'Fixing intermittent 502 responses from the API tier',
    'Handling expired TLS certificates in production',
    'Diagnosing database connection pool exhaustion',
];

const pick = <T>(rnd: () => number, list: readonly T[]): T => list[Math.floor(rnd() * list.length)];

/** ServiceNow-style timestamp: "YYYY-MM-DD HH:mm:ss" */
const snowDate = (rnd: () => number): string => {
    const daysAgo = Math.floor(rnd() * 720);
    const d = new Date(Date.now() - daysAgo * 86_400_000);
    d.setHours(Math.floor(rnd() * 24), Math.floor(rnd() * 60), Math.floor(rnd() * 60), 0);
    return d.toISOString().replace('T', ' ').slice(0, 19);
};

const articleBody = (topic: string, category: string): string =>
    [
        `<h2>Summary</h2>`,
        `<p>${topic}. This article applies to production and pre-production environments in the ${category.toLowerCase()} category.</p>`,
        `<h2>Symptoms</h2>`,
        `<ul><li>Alerts raised by monitoring</li><li>Users report degraded response times</li><li>Errors present in the application log</li></ul>`,
        `<h2>Resolution</h2>`,
        `<ol><li>Confirm the alert against the monitoring dashboard.</li><li>Collect diagnostics from the affected node.</li><li>Apply the documented remediation and verify recovery.</li><li>Update the incident with findings.</li></ol>`,
        `<h2>Escalation</h2>`,
        `<p>If the issue persists after remediation, escalate to the owning application team with the collected diagnostics attached.</p>`,
    ].join('\n');

export const makeKnowledgeArticle = (overrides: Partial<KnowledgeArticle_From_List_API> = {}, seed = 1): KnowledgeArticle_From_List_API => {
    const rnd = createRandom(seed);
    const topic = pick(rnd, TOPICS);
    const category = pick(rnd, CATEGORIES);
    const sysId = Array.from({ length: 32 }, () => Math.floor(rnd() * 16).toString(16)).join('');

    return {
        sys_id: dv(sysId),
        number: dv(`KB${String(10_000 + Math.floor(rnd() * 89_999)).padStart(7, '0')}`),
        short_description: dv(topic),
        kb_knowledge_base: dv(sysId.slice(0, 32), pick(rnd, KNOWLEDGE_BASES)),
        sys_created_on: dv(snowDate(rnd)),
        author: dv(sysId.slice(0, 32), pick(rnd, AUTHORS)),
        rating: dv(String(1 + Math.floor(rnd() * 5))),
        workflow_state: dv(pick(rnd, WORKFLOW_STATES)),
        text: dv(articleBody(topic, category)),
        kb_category: dv(category.toLowerCase().replace(/\s+/g, '_'), category),
        ai_score: Math.round(rnd() * 10_000) / 10_000,
        ...overrides,
    };
};

/** A relevance-ordered list, as the list API returns it (highest ai_score first). */
export const makeKnowledgeArticles = (count = 5, overrides: Partial<KnowledgeArticle_From_List_API> = {}, startSeed = 1): KnowledgeArticle_From_List_API[] =>
    Array.from({ length: count }, (_, i) => makeKnowledgeArticle(overrides, startSeed + i * 7919)).sort((a, b) => (b.ai_score ?? 0) - (a.ai_score ?? 0));
