const SOP_FIELDS: Record<string, string> = {
    'SOP ID': 'SOP ID',
    SOP_ID: 'SOP ID',
    VERSION: 'Version',
    'OPERATING SYSTEM': 'Operating System',
    OPERATING_SYSTEM: 'Operating System',
    APPLICATION: 'Application',
    'TICKET TYPE': 'Ticket Type',
    TICKET_TYPE: 'Ticket Type',
    DESCRIPTION: 'Description',
    'RESOLUTION STEPS': 'Resolution Steps',
    RESOLUTION_STEPS: 'Resolution Steps',
    'RESOLUTION CRITERIA': 'Resolution Criteria',
    RESOLUTION_CRITERIA: 'Resolution Criteria',
    'ESCALATION CRITERIA': 'Escalation Criteria',
    ESCALATION_CRITERIA: 'Escalation Criteria',
    'ESCALATION MATRIX': 'Escalation Matrix',
    ESCALATION_MATRIX: 'Escalation Matrix',
    SCHEDULED_WORKFLOW_DIAGRAM: 'Workflow Diagram',
};

export const extractSOPContentText = (sopContent: unknown): string => {
    if (!sopContent) return '';
    if (typeof sopContent === 'string') return sopContent;
    if (typeof sopContent === 'object' && sopContent !== null) {
        const obj = sopContent as Record<string, unknown>;
        return String(obj.text || obj.sop_content || obj.content || obj.message || '');
    }
    return String(sopContent);
};

export const extractKbNumber = (content?: unknown, directKbNumber?: string): string => {
    if (directKbNumber && directKbNumber.trim()) return directKbNumber.trim();
    const text = extractSOPContentText(content);
    if (!text) return 'N/A';

    const match = text.match(/(?:KB[_\s]*Number|KB[_\s]*ID|KB[_\s]*NO|KB)\s*:\s*(KB[0-9]+|[A-Za-z0-9_-]+)/i);
    if (match && match[1]) {
        return match[1].trim();
    }

    const standaloneMatch = text.match(/\b(KB[0-9]{4,})\b/i);
    if (standaloneMatch && standaloneMatch[1]) {
        return standaloneMatch[1].trim();
    }

    return 'N/A';
};

export interface MandatoryValidationResult {
    isValid: boolean;
    missingSections: string[];
}

export const REQUIRED_SOP_SECTIONS = [
    { name: 'SOP ID / Title', regex: /(?:SOP[_\s]*ID|Title)\s*:/i },
    { name: 'Version', regex: /VERSION\s*:/i },
    { name: 'Operating System', regex: /(?:OPERATING[_\s]*SYSTEM|OS)\s*:/i },
    { name: 'Application', regex: /APPLICATION\s*:/i },
    { name: 'Ticket Type', regex: /TICKET[_\s]*TYPE\s*:/i },
    { name: 'Description', regex: /DESCRIPTION\s*:/i },
    { name: 'Resolution Steps', regex: /(?:RESOLUTION[_\s]*STEPS|Step\s+\d+)/i },
    { name: 'Resolution Criteria', regex: /(?:RESOLUTION[_\s]*CRITERIA|CRITERIA|VALIDATION|Closure)/i },
    { name: 'Escalation Criteria', regex: /(?:ESCALATION[_\s]*CRITERIA|ESCALATION)/i },
    { name: 'Escalation Matrix', regex: /(?:ESCALATION[_\s]*MATRIX|ESCALATION|L1:)/i },
];

export const validateMandatorySections = (content: unknown, title?: string): MandatoryValidationResult => {
    const raw = extractSOPContentText(content).trim();
    const missing: string[] = [];

    for (const section of REQUIRED_SOP_SECTIONS) {
        if (section.name === 'SOP ID / Title' && title && title.trim()) {
            continue;
        }
        if (!section.regex.test(raw)) {
            missing.push(section.name);
        }
    }

    return {
        isValid: missing.length === 0,
        missingSections: missing,
    };
};

const getFieldLabel = (raw: string): string | undefined => {
    const normalized = raw.trim().replace(/_/g, ' ').replace(/\s+/g, ' ').toUpperCase();
    return SOP_FIELDS[normalized] || SOP_FIELDS[raw.trim().toUpperCase()];
};

const normalizeLabel = (text: string): string => text.trim().replace(/:.*$/, '').replace(/_/g, ' ').replace(/\s+/g, ' ').toUpperCase();

const isWorkflowHeaderLine = (line: string): boolean => {
    const normalized = normalizeLabel(line);
    return normalized === 'SCHEDULED WORKFLOW DIAGRAM' || normalized === 'WORKFLOW DIAGRAM';
};

const isWorkflowBoundaryLine = (line: string): boolean => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (/^#{1,3}\s+/.test(trimmed)) return true;
    if (/^Step\s+\d+/i.test(trimmed)) return true;
    if (/^\d+\.\s+/.test(trimmed)) return true;
    if (getFieldLabel(trimmed.replace(/:$/, ''))) return true;
    return false;
};

export const extractWorkflowOnlyText = (value: unknown): string => {
    const text = extractSOPContentText(value);
    if (!text || !text.trim()) return '';

    const lines = text.split('\n');
    const workflowLines: string[] = [];
    let capture = false;

    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        const trimmed = line.trim();

        if (isWorkflowHeaderLine(trimmed)) {
            capture = true;
            workflowLines.push(line);
            continue;
        }

        if (capture) {
            if (isWorkflowBoundaryLine(line) && !isWorkflowHeaderLine(trimmed)) {
                break;
            }
            workflowLines.push(line);
        }
    }

    return workflowLines.join('\n');
};

const escHtml = (str: string): string => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const applyInlineCode = (raw: string): string =>
    escHtml(raw)
        .replace(
            /`([^`]+)`/g,
            '<code class="bg-slate-100 dark:bg-slate-800 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded text-xs font-mono border border-slate-200 dark:border-slate-700">$1</code>',
        )
        .replace(
            /\[Suggested Tool:\s*([^\]]+)\]/gi,
            '<span class="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200 px-1.5 py-0.5 rounded text-[11px] font-bold tracking-wide border border-indigo-200 dark:border-indigo-700 mx-1 shadow-sm">[Suggested Tool: $1]</span>',
        );

const captureWorkflowSection = (lines: string[], startIndex: number) => {
    const workflowLines: string[] = [];
    let index = startIndex;

    for (; index < lines.length; index += 1) {
        const line = lines[index];
        const trimmed = line.trim();
        if (index > startIndex && isWorkflowBoundaryLine(line) && !isWorkflowHeaderLine(trimmed)) {
            break;
        }
        workflowLines.push(line);
    }

    return { workflowLines, nextIndex: index - 1 };
};

/* SVG Icons defined as raw HTML strings for inline injection */
const SVG_DOWN_ARROW = `<div class="flex justify-center my-1"><svg class="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg></div>`;
const SVG_QUESTION_MARK = `<div class="flex items-center justify-center w-6 h-6 bg-amber-500 text-white rounded-full font-bold text-xs shadow-sm"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 9.75a3.75 3.75 0 117.5 0c0 1.618-1.22 2.656-2.036 3.195C13.064 13.407 12 14.135 12 15.75v.75m0 3h.008v.008H12v-.008z" /></svg></div>`;
const SVG_ALERT_ICON = `<svg class="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>`;
const SVG_BULLET_ICON = `<svg class="w-2 h-2 text-indigo-900 dark:text-indigo-400 inline-block mr-1.5 shrink-0" fill="currentColor" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4"/></svg>`;

const renderWorkflowLines = (rawLines: string[]): string => {
    const nodesHtml = rawLines
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => !isWorkflowHeaderLine(line))
        .map((l) => {
            const branchMatch = /^\s*(Yes|No)\s*->\s*(.*)$/i.exec(l);
            if (branchMatch) {
                const isYes = /^yes$/i.test(branchMatch[1]);
                const statusClasses = isYes
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';

                return `<div class="flex items-center gap-2 my-2 p-2 rounded-lg border ${statusClasses}"><span class="font-bold text-xs uppercase px-2 py-0.5 rounded bg-white dark:bg-slate-800 border shadow-sm">${
                    isYes ? 'YES' : 'NO'
                }</span><div class="text-xs font-medium">${applyInlineCode(branchMatch[2])}</div></div>`;
            }

            if (/^If\s*\(.*\):?$/i.test(l)) {
                const decisionText = l.replace(/^.*If\s*/i, 'If ').replace(/:$/, '');
                return `<div class="flex items-center gap-2 my-2 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-lg text-amber-900 dark:text-amber-200">${SVG_QUESTION_MARK}<span class="text-xs font-semibold">${applyInlineCode(
                    decisionText,
                )}</span></div>`;
            }

            const isTerminal = /\[Start\]|\[End\]?/i.test(l);
            const cleanedText = l.replace(/^.*->\s*/, '');
            const nodeClasses = isTerminal
                ? 'bg-indigo-600 text-white font-semibold shadow-md'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700';

            return `<div class="p-2.5 my-1 rounded-md text-xs font-mono ${nodeClasses}">${applyInlineCode(cleanedText)}</div>${!isTerminal ? SVG_DOWN_ARROW : ''}`;
        })
        .join('');

    return `<div class="my-4 p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">${nodesHtml}</div>`;
};

const isCommandLine = (line: string): boolean =>
    /^(?:\[Suggested Tool:[^\]]+\]\s*)?\s*(az|aws|gcloud|kubectl|helm|docker|podman|systemctl|journalctl|git|curl|ssh|scp|sudo|python|pip|npm|yarn|terraform|ansible|Get-|Set-|Restart-|Stop-|Start-|Test-|New-|Remove-|Update-)\b/i.test(
        line,
    );

const isCommandIntro = (line: string): boolean => /^(example\s+)?(cli\s+)?command\s*:?$/i.test(line) || /^example\s+cli\s+command\s*:?$/i.test(line);

const isHardBoundary = (line: string): boolean => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (/^Step\s+\d+/i.test(trimmed)) return true;
    if (/^\d+\.\d+(\s+|$)/.test(trimmed)) return true;
    const heading = getFieldLabel(trimmed.replace(/:$/, ''));
    return Boolean(heading);
};

const nextNonBlankIndex = (lines: string[], startIndex: number): number => {
    for (let index = startIndex; index < lines.length; index += 1) {
        if (lines[index].trim()) return index;
    }
    return -1;
};

export const sopTextToHtml = (value: unknown): string => {
    const text = extractSOPContentText(value);
    if (!text || !text.trim()) return '';

    const lines = text.split('\n');
    let html = '';
    let inCodeBlock = false;
    let codeLang = '';
    let codeLines: string[] = [];

    const flushCodeBlock = () => {
        const body = codeLines.map((line) => escHtml(line)).join('\n');
        const langAttr = codeLang ? ` data-lang="${escHtml(codeLang)}"` : '';
        html += `<pre class="relative my-3 p-4 bg-slate-900 text-slate-100 rounded-lg overflow-x-auto font-mono text-xs leading-relaxed shadow-inner"${langAttr}><code class="bg-transparent border-0 p-0 text-inherit">${body}</code></pre>`;
        codeLines = [];
        codeLang = '';
        inCodeBlock = false;
    };

    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        if (line.trim().startsWith('```')) {
            if (inCodeBlock) {
                if (codeLang === 'workflow') {
                    const nodesHtml = codeLines
                        .map((l) => l.trim())
                        .filter(Boolean)
                        .map((l) => {
                            if (l.startsWith('Yes ->') || l.startsWith('No ->')) {
                                const isYes = l.startsWith('Yes');
                                const text = l.replace(/^(Yes|No)\s*->\s*/, '');
                                const statusClasses = isYes ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-rose-50 text-rose-800 border-rose-300';
                                return `<div class="flex items-center gap-2 my-2 p-2 rounded-lg border ${statusClasses}"><span class="font-bold text-xs uppercase px-2 py-0.5 rounded bg-white border shadow-sm">${
                                    isYes ? 'YES' : 'NO'
                                }</span><div class="text-xs">${applyInlineCode(text)}</div></div>`;
                            }
                            if (l.includes('If (')) {
                                const decisionText = l.replace(/^.*If\s*\(/, 'If (').replace(/:\s*$/, '');
                                return `<div class="flex items-center gap-2 my-2 p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-900">${SVG_QUESTION_MARK}<span class="text-xs font-semibold">${applyInlineCode(
                                    decisionText,
                                )}</span></div>`;
                            }
                            const isTerminal = l.includes('[Start]') || l.includes('[End');
                            const cleanedText = l.replace(/^.*->\s*/, '');
                            const nodeClasses = isTerminal ? 'bg-indigo-600 text-white font-semibold shadow-md' : 'bg-slate-100 text-slate-800 border border-slate-200';
                            return `<div class="p-2.5 my-1 rounded-md text-xs font-mono ${nodeClasses}">${applyInlineCode(cleanedText)}</div>${!isTerminal ? SVG_DOWN_ARROW : ''}`;
                        })
                        .join('');

                    html += `<div class="my-4 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">${nodesHtml}</div>`;
                } else {
                    const body = codeLines.map((line) => escHtml(line)).join('\n');
                    const langAttr = codeLang ? ` data-lang="${escHtml(codeLang)}"` : '';
                    html += `<pre class="relative my-3 p-4 bg-slate-900 text-slate-100 rounded-lg overflow-x-auto font-mono text-xs leading-relaxed shadow-inner"${langAttr}><code class="bg-transparent border-0 p-0 text-inherit">${body}</code></pre>`;
                }
                codeLines = [];
                codeLang = '';
                inCodeBlock = false;
            } else {
                inCodeBlock = true;
                codeLang = line.trim().slice(3).trim();
                codeLines = [];
            }
            continue;
        }

        if (inCodeBlock) {
            codeLines.push(line);
            continue;
        }

        const trimmed = line.trim();

        if (!trimmed) continue;
        if (isWorkflowHeaderLine(trimmed)) {
            const { workflowLines, nextIndex } = captureWorkflowSection(lines, index);
            html += renderWorkflowLines(workflowLines);
            index = nextIndex;
            continue;
        }
        if (/^[\u2550=\u2500\-]{4,}$/.test(trimmed)) {
            html += '<hr class="my-4 border-t-2 border-slate-200 dark:border-slate-700">';
            continue;
        }

        const h3md = trimmed.match(/^###\s+(.*)/);
        if (h3md) {
            html += `<h3 class="text-sm font-bold text-indigo-900 dark:text-indigo-300 mt-4 mb-2 pb-1 border-b border-slate-200 dark:border-slate-700">${applyInlineCode(h3md[1])}</h3>`;
            continue;
        }
        const h2md = trimmed.match(/^##\s+(.*)/);
        if (h2md) {
            html += `<h2 class="text-base font-bold text-indigo-950 dark:text-indigo-200 mt-5 mb-2 pb-1 border-b-2 border-indigo-900 dark:border-indigo-500 uppercase tracking-wide">${applyInlineCode(h2md[1])}</h2>`;
            continue;
        }
        const h1md = trimmed.match(/^#\s+(.*)/);
        if (h1md) {
            html += `<h1 class="text-lg font-extrabold text-indigo-950 dark:text-indigo-100 mt-6 mb-3">${applyInlineCode(h1md[1])}</h1>`;
            continue;
        }

        if (/^WARNING\s*:/i.test(trimmed)) {
            const msg = trimmed.replace(/^WARNING\s*:\s*/i, '');
            html += `<div class="flex items-start gap-2.5 my-3 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 border-l-4 border-l-amber-500 rounded-r-lg text-amber-900 dark:text-amber-200 text-xs leading-relaxed">${SVG_ALERT_ICON}<span><strong class="font-bold">WARNING:</strong> ${applyInlineCode(
                msg,
            )}</span></div>`;
            continue;
        }

        const fieldOnlyLabel = getFieldLabel(trimmed);
        if (fieldOnlyLabel) {
            html += `<h2 class="text-sm font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider mt-5 mb-2 pb-1 border-b-2 border-indigo-900 dark:border-indigo-500">${fieldOnlyLabel}</h2>`;
            continue;
        }

        const fieldMatch = trimmed.match(/^([A-Za-z][A-Za-z _]+):\s*(.*)$/);
        if (fieldMatch) {
            const label = getFieldLabel(fieldMatch[1]);
            if (label) {
                const value = fieldMatch[2].trim();
                if (value) {
                    html += `<p class="my-1 py-1.5 px-3 bg-indigo-50/60 dark:bg-indigo-950/30 border-l-4 border-indigo-900 dark:border-indigo-500 rounded-r text-xs"><strong class="text-indigo-900 dark:text-indigo-300 font-bold uppercase tracking-wider text-[11px] mr-1.5">${label}:</strong> <span class="text-slate-700 dark:text-slate-300">${applyInlineCode(
                        value,
                    )}</span></p>`;
                } else {
                    html += `<h2 class="text-sm font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider mt-5 mb-2 pb-1 border-b-2 border-indigo-900 dark:border-indigo-500">${label}</h2>`;
                }
                continue;
            }
        }

        const stepMatch = trimmed.match(/^Step\s+(\d+)\s*(?::|[\u2013\u2014-])\s*(.*)/i);
        if (stepMatch) {
            html += `<p class="my-3 py-2 px-3 bg-blue-50 dark:bg-blue-950/40 border-l-4 border-indigo-900 dark:border-indigo-500 rounded-r text-xs font-bold text-indigo-950 dark:text-indigo-200"><span class="font-extrabold mr-1">Step ${
                stepMatch[1]
            }</span>${stepMatch[2] ? ` - ${applyInlineCode(stepMatch[2])}` : ''}</p>`;
            continue;
        }

        const subMatch = trimmed.match(/^(\d+\.\d+)\s+(.*)/);
        if (subMatch) {
            html += `<p class="flex items-baseline gap-2.5 my-1 ml-5 text-xs"><span class="font-semibold text-indigo-900 dark:text-indigo-400 min-w-7 shrink-0">${
                subMatch[1]
            }</span><span class="text-slate-700 dark:text-slate-300 flex-1">${applyInlineCode(subMatch[2])}</span></p>`;
            continue;
        }

        const splitSubMatch = trimmed.match(/^(\d+\.\d+)$/);
        if (splitSubMatch) {
            const nextIndex = nextNonBlankIndex(lines, index + 1);
            if (nextIndex > -1 && !isHardBoundary(lines[nextIndex])) {
                html += `<p class="flex items-baseline gap-2.5 my-1 ml-5 text-xs"><span class="font-semibold text-indigo-900 dark:text-indigo-400 min-w-7 shrink-0">${
                    splitSubMatch[1]
                }</span><span class="text-slate-700 dark:text-slate-300 flex-1">${applyInlineCode(lines[nextIndex].trim())}</span></p>`;
                index = nextIndex;
            } else {
                html += `<p class="flex items-baseline gap-2.5 my-1 ml-5 text-xs"><span class="font-semibold text-indigo-900 dark:text-indigo-400 min-w-7 shrink-0">${splitSubMatch[1]}</span></p>`;
            }
            continue;
        }

        if (/^Tool\s+Name\s*:/i.test(trimmed)) continue;

        if (isCommandIntro(trimmed)) {
            const nextIndex = nextNonBlankIndex(lines, index + 1);
            html += `<p class="my-1 ml-5 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5 flex-wrap"><span class="font-semibold text-slate-900 dark:text-slate-100">${applyInlineCode(
                trimmed.replace(/:$/, ''),
            )}:</span></p>`;
            if (nextIndex > -1 && isCommandLine(lines[nextIndex])) {
                html += `<pre class="my-2 p-3 bg-slate-900 text-slate-100 rounded-md overflow-x-auto font-mono text-xs"><code class="p-0 bg-transparent text-inherit border-0">${escHtml(
                    lines[nextIndex].trim(),
                )}</code></pre>`;
                index = nextIndex;
            }
            continue;
        }

        if (isCommandLine(trimmed)) {
            html += `<pre class="my-2 p-3 bg-slate-900 text-slate-100 rounded-md overflow-x-auto font-mono text-xs"><code class="p-0 bg-transparent text-inherit border-0">${escHtml(trimmed)}</code></pre>`;
            continue;
        }

        const levelMatch = trimmed.match(/^(L[123])\s*:\s*(.*)/i);
        if (levelMatch) {
            html += `<p class="my-1 ml-2 text-xs text-slate-700 dark:text-slate-300"><span class="font-bold text-red-600 dark:text-red-400 mr-1">${
                levelMatch[1]
            }:</span> ${applyInlineCode(levelMatch[2])}</p>`;
            continue;
        }

        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
            html += `<p class="my-1 pl-1 text-xs text-slate-800 dark:text-slate-200"><span class="font-bold text-indigo-900 dark:text-indigo-400 min-w-5 inline-block">${
                numMatch[1]
            }.</span> ${applyInlineCode(numMatch[2])}</p>`;
            continue;
        }

        const bulletMatch = trimmed.match(/^[-*\u2022\u2192]\s*(.*)/);
        if (bulletMatch) {
            html += `<p class="my-1 pl-4 text-xs text-slate-600 dark:text-slate-400 flex items-center">${SVG_BULLET_ICON}<span>${applyInlineCode(bulletMatch[1])}</span></p>`;
            continue;
        }

        html += `<p class="my-1 text-xs leading-relaxed text-slate-700 dark:text-slate-300">${applyInlineCode(trimmed)}</p>`;
    }

    if (inCodeBlock && codeLines.length) flushCodeBlock();
    return html;
};

export const buildEnhancePrompt = (sop: Record<string, unknown>): string => {
    const content = extractSOPContentText(sop?.sop_content);
    const metadata = [
        sop?.sop_name ? `SOP Name: ${sop.sop_name}` : '',
        sop?.category ? `Category: ${sop.category}` : '',
        sop?.is_approved ? `Approval Status: ${sop.is_approved}` : '',
        sop?.created_by ? `Created By: ${sop.created_by}` : '',
    ]
        .filter(Boolean)
        .join('\n');

    return `Enhancing By fasteai\n\nEnhance this SOP using the existing production SOP pattern and the required SOP document structure. Identify missing or weak sections, fill gaps, improve technical accuracy, normalize SOP_ID/version/category/ticket type, add complete automation-ready resolution steps, strengthen resolution criteria and escalation criteria, and preserve any useful existing details. Return the full corrected SOP in sop_content, not only a summary.\n\n${metadata}\n\nCurrent SOP:\n${content}`;
};

export const copyTextToClipboard = async (content: unknown): Promise<boolean> => {
    const text = extractSOPContentText(content);
    if (!text.trim()) return false;

    if (navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {}
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const result = document.execCommand('copy');
    document.body.removeChild(textarea);
    return result;
};

const crcTable = (() => {
    const table = new Uint32Array(256);
    for (let index = 0; index < 256; index += 1) {
        let value = index;
        for (let bit = 0; bit < 8; bit += 1) {
            value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
        }
        table[index] = value >>> 0;
    }
    return table;
})();

const crc32 = (bytes: Uint8Array): number => {
    let crc = 0xffffffff;
    for (let index = 0; index < bytes.length; index += 1) {
        crc = crcTable[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
};

const writeUInt16 = (bytes: Uint8Array, offset: number, value: number) => {
    bytes[offset] = value & 0xff;
    bytes[offset + 1] = (value >>> 8) & 0xff;
};

const writeUInt32 = (bytes: Uint8Array, offset: number, value: number) => {
    bytes[offset] = value & 0xff;
    bytes[offset + 1] = (value >>> 8) & 0xff;
    bytes[offset + 2] = (value >>> 16) & 0xff;
    bytes[offset + 3] = (value >>> 24) & 0xff;
};

const concatBytes = (parts: Uint8Array[]): Uint8Array => {
    const length = parts.reduce((total, part) => total + part.length, 0);
    const output = new Uint8Array(length);
    let offset = 0;
    parts.forEach((part) => {
        output.set(part, offset);
        offset += part.length;
    });
    return output;
};

const createZipBlob = (files: { name: string; content: string | Uint8Array }[]): Blob => {
    const encoder = new TextEncoder();
    const localParts: Uint8Array[] = [];
    const centralParts: Uint8Array[] = [];
    let localOffset = 0;
    const dosTime = 0;
    const dosDate = 0x21;

    files.forEach(({ name, content }) => {
        const nameBytes = encoder.encode(name);
        const contentBytes = typeof content === 'string' ? encoder.encode(content) : content;
        const crc = crc32(contentBytes);

        const localHeader = new Uint8Array(30 + nameBytes.length);
        writeUInt32(localHeader, 0, 0x04034b50);
        writeUInt16(localHeader, 4, 20);
        writeUInt16(localHeader, 6, 0);
        writeUInt16(localHeader, 8, 0);
        writeUInt16(localHeader, 10, dosTime);
        writeUInt16(localHeader, 12, dosDate);
        writeUInt32(localHeader, 14, crc);
        writeUInt32(localHeader, 18, contentBytes.length);
        writeUInt32(localHeader, 22, contentBytes.length);
        writeUInt16(localHeader, 26, nameBytes.length);
        writeUInt16(localHeader, 28, 0);
        localHeader.set(nameBytes, 30);
        localParts.push(localHeader, contentBytes);

        const centralHeader = new Uint8Array(46 + nameBytes.length);
        writeUInt32(centralHeader, 0, 0x02014b50);
        writeUInt16(centralHeader, 4, 20);
        writeUInt16(centralHeader, 6, 20);
        writeUInt16(centralHeader, 8, 0);
        writeUInt16(centralHeader, 10, 0);
        writeUInt16(centralHeader, 12, dosTime);
        writeUInt16(centralHeader, 14, dosDate);
        writeUInt32(centralHeader, 16, crc);
        writeUInt32(centralHeader, 20, contentBytes.length);
        writeUInt32(centralHeader, 24, contentBytes.length);
        writeUInt16(centralHeader, 28, nameBytes.length);
        writeUInt16(centralHeader, 30, 0);
        writeUInt16(centralHeader, 32, 0);
        writeUInt16(centralHeader, 34, 0);
        writeUInt16(centralHeader, 36, 0);
        writeUInt32(centralHeader, 38, 0);
        writeUInt32(centralHeader, 42, localOffset);
        centralHeader.set(nameBytes, 46);
        centralParts.push(centralHeader);

        localOffset += localHeader.length + contentBytes.length;
    });

    const centralDirectory = concatBytes(centralParts);
    const endRecord = new Uint8Array(22);
    writeUInt32(endRecord, 0, 0x06054b50);
    writeUInt16(endRecord, 4, 0);
    writeUInt16(endRecord, 6, 0);
    writeUInt16(endRecord, 8, files.length);
    writeUInt16(endRecord, 10, files.length);
    writeUInt32(endRecord, 12, centralDirectory.length);
    writeUInt32(endRecord, 16, localOffset);
    writeUInt16(endRecord, 20, 0);

    const parts = [...localParts, centralDirectory, endRecord] as unknown as BlobPart[];

    return new Blob(parts, {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
};

const escapeXml = (value: unknown): string => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const isDocxHeading = (line: string): boolean => {
    const trimmed = line.trim().replace(/:$/, '');
    return Boolean(getFieldLabel(trimmed)) || /^Step\s+\d+/i.test(trimmed);
};

const isDocxCommand = (line: string): boolean => isCommandLine(line.trim());

const docxRun = (text: string, options: { bold?: boolean; code?: boolean } = {}): string => {
    const props = [options.bold ? '<w:b/>' : '', options.code ? '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>' : ''].filter(Boolean).join('');
    return `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ''}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
};

const docxParagraph = (line: string): string => {
    const trimmed = line.trim();
    const isHeading = isDocxHeading(trimmed);
    const isCode = isDocxCommand(trimmed);
    const paragraphProps = [isHeading ? '<w:spacing w:before="160" w:after="80"/>' : '<w:spacing w:after="80"/>', isCode ? '<w:shd w:fill="F1F5F9"/>' : '']
        .filter(Boolean)
        .join('');
    return `<w:p>${paragraphProps ? `<w:pPr>${paragraphProps}</w:pPr>` : ''}${docxRun(trimmed, { bold: isHeading, code: isCode })}</w:p>`;
};

const buildDocumentXml = (content: unknown): string => {
    const text = extractSOPContentText(content)
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n');
    const lines = text.split('\n');
    const paragraphs = lines
        .filter((line, index) => line.trim() || (index > 0 && lines[index - 1].trim() && lines[index + 1]?.trim()))
        .map(docxParagraph)
        .join('');

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="[http://schemas.openxmlformats.org/wordprocessingml/2006/main](http://schemas.openxmlformats.org/wordprocessingml/2006/main)">
  <w:body>
    ${paragraphs || docxParagraph('')}
    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>
  </w:body>
</w:document>`;
};

export const sanitizeDocxFileName = (name: unknown = 'SOP_Document'): string => {
    const cleaned = String(name || 'SOP_Document')
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-z0-9_-]+/gi, '_')
        .replace(/^_+|_+$/g, '');
    return `${cleaned || 'SOP_Document'}.docx`;
};

export const downloadSOPAsDocx = (content: unknown, fileName: unknown): boolean => {
    const text = extractSOPContentText(content);
    if (!text.trim()) return false;

    const blob = createZipBlob([
        {
            name: '[Content_Types].xml',
            content:
                '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="[http://schemas.openxmlformats.org/package/2006/content-types](http://schemas.openxmlformats.org/package/2006/content-types)"><Default ContentType="application/vnd.openxmlformats-package.relationships+xml" Extension="rels"/><Default ContentType="application/xml" Extension="xml"/><Override ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml" PartName="/word/document.xml"/></Types>',
        },
        {
            name: '_rels/.rels',
            content:
                '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="[http://schemas.openxmlformats.org/package/2006/relationships](http://schemas.openxmlformats.org/package/2006/relationships)"><Relationship Id="rId1" Target="word/document.xml" Type="[http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument](http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument)"/></Relationships>',
        },
        {
            name: 'word/document.xml',
            content: buildDocumentXml(text),
        },
    ]);

    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = sanitizeDocxFileName(fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
};
