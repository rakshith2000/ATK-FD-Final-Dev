import { useState } from 'react';
import RenderMarkdown from '@/shared/components/smart/RenderMarkdown/RenderMarkdown';
import { BarChart3, Network, Sparkles, RefreshCw, Copy, Check, AlertTriangle } from 'lucide-react';
import { useCopyText } from '@/shared/hooks/useCopyText';

// ─── Preset Markdown Samples ──────────────────────────────────────────

const SAMPLE_ARCHITECTURE_FLOWCHART = `### Architecture & Component Layers Flowchart

\`\`\`mermaid
graph TB
    subgraph UNIVERSE["Outside Universe"]
        EXT["External APIs<br/>(ServiceNow, Azure, AWS)"]
    end

    subgraph APP["Application Architecture"]
        direction TB

        subgraph L1["Layer 1 — Connector Layer [Non-React]"]
            AX1["backendApiClient"]
            AX2["serviceNowApiClient"]
            AX3["azureApiClient"]
            INT["Interceptors<br/>• Auth token injection<br/>• Token refresh & retry"]
        end

        subgraph L2["Layer 2 — Error Handling Layer [Non-React]"]
            HOF["withApiResponseHandler&lt;T&gt;<br/>(Higher-Order Function)"]
        end

        subgraph L3["Layer 3 — Types & Type Guards [Non-React]"]
            TYPES["Types (types/)<br/>Data contracts for API<br/>request/response shapes"]
            GUARDS["Type Guards (type-guards/)<br/>Runtime validators<br/>unknown → typed data"]
        end

        subgraph L4["Layer 4 — Service Layer [Non-React]"]
            SVC["Service Functions<br/>Async functions wrapped in<br/>withApiResponseHandler +<br/>validated by type guards"]
        end

        subgraph L5["Layer 5 — TanStack React Query Layer [React]"]
            QH["Query Hooks<br/>useQuery + queryFn"]
            MH["Mutation Hooks<br/>useMutation + mutationFn<br/>+ onError / onSuccess"]
        end

        subgraph L6["Layer 6 — Presentation Layer [React]"]
            SMART["Smart Components<br/>State, hooks, mutations,<br/>cache updates"]
            UI["UI Components<br/>Pure presentation,<br/>props only, no API calls"]
        end
    end

    subgraph BUS["Event Bus (mitt) — Cross-Layer Communication"]
        DIALOG["globalAlertDialogEventBus"]
        TOAST["globalAlertToastEventBus"]
    end

    EXT <-->|HTTP / REST| L1
    AX1 & AX2 & AX3 --> INT
    L1 --> HOF
    HOF --> SVC
    TYPES -.->|imported by| SVC & QH & MH & SMART
    GUARDS -.->|used by| SVC
    SVC --> QH & MH
    QH & MH --> SMART
    SMART --> UI

    HOF -->|"emit (401 auth)"| DIALOG
    MH -->|"emit (error/success)"| DIALOG & TOAST
    DIALOG -->|listen| SMART
    TOAST -->|listen| SMART
\`\`\`
`;

const SAMPLE_SEQUENCE_DIAGRAM = `### Incident Triage Sequence Diagram

\`\`\`mermaid
sequenceDiagram
    autonumber
    actor User as Operations Engineer
    participant UI as Smart Component (IncidentView)
    participant Hook as useIncidentTriageMutation
    participant Service as incidentService
    participant API as Backend API Server
    participant Bus as globalAlertToastEventBus

    User->>UI: Click "Trigger AI Incident Analysis"
    UI->>Hook: mutate({ incidentId: "INC0091823" })
    Hook->>Service: triageIncident(payload)
    Service->>API: POST /api/v1/incidents/INC0091823/triage
    alt Analysis Succeeded
        API-->>Service: 200 OK (RCA summary, remediation steps)
        Service-->>Hook: Parsed IncidentAnalysisResponse
        Hook->>UI: onSuccess(data) -> update cache
        Hook->>Bus: emit("show-alert-toast", { severity: "success" })
        UI-->>User: Render RCA summary & remediation actions
    else Server or Timeout Error
        API-->>Service: 500 Internal Error / 504 Timeout
        Service-->>Hook: throw ApiError("Analysis Failed")
        Hook->>Bus: emit("show-alert-toast", { severity: "error" })
        Hook->>UI: onError() -> display error banner
        UI-->>User: Show retry button & failure details
    end
\`\`\`
`;

const SAMPLE_STATE_MINDMAP_DIAGRAM = `### Ticket Lifecycle State Diagram & Platform Mindmap

\`\`\`mermaid
stateDiagram-v2
    [*] --> New: Ticket Created
    New --> InProgress: Assign Engineer
    InProgress --> AwaitingInfo: Need User Input
    AwaitingInfo --> InProgress: User Responded
    InProgress --> Resolved: Remediation Verified
    Resolved --> Closed: 7-Day Auto Close
    Resolved --> InProgress: Reopened by User
    Closed --> [*]
\`\`\`

\`\`\`mermaid
mindmap
  root((ITOps Platform))
    Incident AI
      Anomaly Detection
      Root Cause Analysis
      Runbook Automation
    Connectors
      ServiceNow
      Azure Monitor
      Dynatrace
    Admin Portal
      Form Builder
      Connector Config
      User Roles
    Analytics
      SLA Compliance
      MTTR Reduction
      Volume Forecasts
\`\`\`
`;

const SAMPLE_BAR_CHART = `### Incident Distribution by Assignment Group

\`\`\`chart
{
  "type": "bar",
  "data": {
    "labels": ["Cloud Infrastructure", "DevOps & CI/CD", "Security Operations", "Database Admin", "Network Core", "App Support"],
    "datasets": [
      {
        "label": "Open Incidents",
        "data": [42, 28, 15, 34, 19, 52],
        "backgroundColor": "rgba(99, 102, 241, 0.7)",
        "borderColor": "rgb(99, 102, 241)",
        "borderWidth": 1
      },
      {
        "label": "Resolved Today",
        "data": [35, 30, 18, 26, 22, 48],
        "backgroundColor": "rgba(16, 185, 129, 0.7)",
        "borderColor": "rgb(16, 185, 129)",
        "borderWidth": 1
      }
    ]
  },
  "options": {
    "plugins": {
      "title": {
        "display": true,
        "text": "Daily Incident Inflow vs Resolution by Team"
      },
      "legend": {
        "position": "top"
      }
    }
  }
}
\`\`\`
`;

const SAMPLE_LINE_CHART = `### System Resource & Anomaly Metric Telemetry

\`\`\`chart
{
  "type": "line",
  "data": {
    "labels": ["00:00", "03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00"],
    "datasets": [
      {
        "label": "CPU Utilization (%)",
        "data": [24, 28, 35, 68, 85, 92, 74, 45],
        "borderColor": "#ef4444",
        "backgroundColor": "rgba(239, 68, 68, 0.1)",
        "fill": true,
        "tension": 0.35
      },
      {
        "label": "Memory Used (%)",
        "data": [55, 56, 58, 62, 70, 72, 68, 60],
        "borderColor": "#3b82f6",
        "backgroundColor": "rgba(59, 130, 246, 0.05)",
        "fill": true,
        "tension": 0.35
      },
      {
        "label": "Network I/O (MB/s)",
        "data": [12, 10, 15, 45, 60, 58, 40, 22],
        "borderColor": "#10b981",
        "borderDash": [5, 5],
        "tension": 0.35
      }
    ]
  },
  "options": {
    "plugins": {
      "title": {
        "display": true,
        "text": "Server Cluster Telemetry (Last 24 Hours)"
      }
    }
  }
}
\`\`\`
`;

const SAMPLE_DOUGHNUT_RADAR_CHARTS = `### Severity Breakdown & Operational Readiness

\`\`\`chart
{
  "type": "doughnut",
  "data": {
    "labels": ["P1 - Critical", "P2 - High", "P3 - Moderate", "P4 - Low"],
    "datasets": [
      {
        "data": [4, 18, 54, 82],
        "backgroundColor": [
          "#ef4444",
          "#f97316",
          "#3b82f6",
          "#10b981"
        ]
      }
    ]
  },
  "options": {
    "plugins": {
      "title": {
        "display": true,
        "text": "Active Incidents by Severity Level"
      }
    }
  }
}
\`\`\`

\`\`\`chart
{
  "type": "radar",
  "data": {
    "labels": ["Automation Coverage", "MTTR Speed", "SLA Adherence", "Doc Quality", "Monitoring Fidelity", "Self-Healing"],
    "datasets": [
      {
        "label": "Current Sprint",
        "data": [85, 78, 92, 70, 88, 65],
        "backgroundColor": "rgba(99, 102, 241, 0.2)",
        "borderColor": "#6366f1",
        "pointBackgroundColor": "#6366f1"
      },
      {
        "label": "Target Benchmark",
        "data": [90, 85, 95, 80, 90, 80],
        "backgroundColor": "rgba(16, 185, 129, 0.15)",
        "borderColor": "#10b981",
        "pointBackgroundColor": "#10b981"
      }
    ]
  },
  "options": {
    "plugins": {
      "title": {
        "display": true,
        "text": "Operations Readiness Radar"
      }
    }
  }
}
\`\`\`
`;

const SAMPLE_ERROR_TEST_CASES = `### Error Handling Diagnostic Test Cases

Below are samples of intentionally malformed diagrams and charts to verify clear error messages, source viewer, and copy buttons:

#### 1. Malformed Mermaid Syntax Error
\`\`\`mermaid
graph INVALID
    A --> [Missing bracket label
    B ---> C ===? Unknown syntax
\`\`\`

#### 2. Malformed Chart JSON Syntax Error
\`\`\`chart
{
  "type": "bar",
  "data": {
    "labels": ["Jan", "Feb"],
    "datasets": [{ "label": "Sales", "data": [10, 20] missing_comma }]
  }
}
\`\`\`

#### 3. Missing Chart Type & Data Error
\`\`\`chart
{
  "options": { "responsive": true }
}
\`\`\`
`;

// ─── Main Demo Component ──────────────────────────────────────────────

export default function MarkdownChartsAndMermaidDemo() {
    const [activeTab, setActiveTab] = useState<'playground' | 'flowchart' | 'sequence' | 'mindmap' | 'barchart' | 'linechart' | 'doughnut' | 'errors'>('flowchart');
    const [customMarkdown, setCustomMarkdown] = useState<string>(SAMPLE_ARCHITECTURE_FLOWCHART);
    const { copied, copy } = useCopyText();

    const loadPreset = (tab: typeof activeTab, content: string) => {
        setActiveTab(tab);
        setCustomMarkdown(content);
    };

    return (
        <div className="flex flex-col gap-6 p-4 sm:p-6 max-w-7xl mx-auto">
            {/* Navigation Tabs / Presets */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
                <button
                    type="button"
                    onClick={() => setActiveTab('playground')}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        activeTab === 'playground' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                >
                    <Sparkles className="w-3.5 h-3.5" />
                    Interactive Live Editor
                </button>
                <div className="h-5 w-px bg-slate-200 mx-1" />
                <button
                    type="button"
                    onClick={() => loadPreset('flowchart', SAMPLE_ARCHITECTURE_FLOWCHART)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        activeTab === 'flowchart' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                >
                    <Network className="w-3.5 h-3.5" />
                    Architecture Flowchart
                </button>
                <button
                    type="button"
                    onClick={() => loadPreset('sequence', SAMPLE_SEQUENCE_DIAGRAM)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        activeTab === 'sequence' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                >
                    <Network className="w-3.5 h-3.5" />
                    Sequence Diagram
                </button>
                <button
                    type="button"
                    onClick={() => loadPreset('mindmap', SAMPLE_STATE_MINDMAP_DIAGRAM)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        activeTab === 'mindmap' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                >
                    <Network className="w-3.5 h-3.5" />
                    State & Mindmap
                </button>
                <div className="h-5 w-px bg-slate-200 mx-1" />
                <button
                    type="button"
                    onClick={() => loadPreset('barchart', SAMPLE_BAR_CHART)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        activeTab === 'barchart' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                >
                    <BarChart3 className="w-3.5 h-3.5" />
                    Bar Chart
                </button>
                <button
                    type="button"
                    onClick={() => loadPreset('linechart', SAMPLE_LINE_CHART)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        activeTab === 'linechart' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                >
                    <BarChart3 className="w-3.5 h-3.5" />
                    Line Chart
                </button>
                <button
                    type="button"
                    onClick={() => loadPreset('doughnut', SAMPLE_DOUGHNUT_RADAR_CHARTS)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        activeTab === 'doughnut' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                >
                    <BarChart3 className="w-3.5 h-3.5" />
                    Doughnut & Radar
                </button>
                <div className="h-5 w-px bg-slate-200 mx-1" />
                <button
                    type="button"
                    onClick={() => loadPreset('errors', SAMPLE_ERROR_TEST_CASES)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        activeTab === 'errors' ? 'bg-red-600 text-white shadow-xs' : 'bg-white border border-red-200 text-red-700 hover:bg-red-50'
                    }`}
                >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Error Test Cases
                </button>
            </div>

            {/* Main Content Area */}
            {activeTab === 'playground' ? (
                /* ── Interactive Live Split Playground ── */
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    {/* Left: Editor Input */}
                    <div className="flex flex-col gap-2 bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-800">Raw Markdown Input</span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => copy(customMarkdown)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                                    title="Copy raw markdown"
                                >
                                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                    <span>{copied ? 'Copied' : 'Copy'}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCustomMarkdown(SAMPLE_ARCHITECTURE_FLOWCHART)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                                    title="Reset to architecture sample"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    <span>Reset</span>
                                </button>
                            </div>
                        </div>
                        <textarea
                            value={customMarkdown}
                            onChange={(e) => setCustomMarkdown(e.target.value)}
                            placeholder="Type markdown, ```mermaid diagrams, or ```chart JSON here..."
                            rows={24}
                            className="w-full font-mono text-xs p-3 rounded-lg border border-slate-200 bg-slate-900 text-slate-100 focus:outline-indigo-500 focus:ring-1 focus:ring-indigo-500 custom-scrollbar leading-relaxed"
                        />
                        <div className="text-[0.7rem] text-slate-400">
                            Tip: Try hovering on the diagram/chart in the preview panel to test <strong>Enlarge (Fullscreen Pan/Zoom)</strong> and <strong>Copy Code</strong>.
                        </div>
                    </div>

                    {/* Right: Rendered Output */}
                    <div className="flex flex-col gap-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs min-h-145">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                            <span className="text-xs font-semibold text-slate-800">Live Rendered Markdown Output</span>
                            <span className="text-[0.7rem] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium border border-emerald-100">Live Preview Active</span>
                        </div>
                        <div className="overflow-x-auto w-full">
                            <RenderMarkdown text={customMarkdown} />
                        </div>
                    </div>
                </div>
            ) : (
                /* ── Preset Showcase Card ── */
                <div className="flex flex-col gap-4 bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div>
                            <h2 className="text-base font-bold text-slate-900 capitalize">{activeTab} Demo</h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Hover over the diagram or chart below to use the <strong>Enlarge (Fullscreen Pan & Zoom)</strong> and <strong>Copy Code</strong> features.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setCustomMarkdown(
                                    activeTab === 'flowchart'
                                        ? SAMPLE_ARCHITECTURE_FLOWCHART
                                        : activeTab === 'sequence'
                                          ? SAMPLE_SEQUENCE_DIAGRAM
                                          : activeTab === 'mindmap'
                                            ? SAMPLE_STATE_MINDMAP_DIAGRAM
                                            : activeTab === 'barchart'
                                              ? SAMPLE_BAR_CHART
                                              : activeTab === 'linechart'
                                                ? SAMPLE_LINE_CHART
                                                : activeTab === 'doughnut'
                                                  ? SAMPLE_DOUGHNUT_RADAR_CHARTS
                                                  : SAMPLE_ERROR_TEST_CASES,
                                );
                                setActiveTab('playground');
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer self-start sm:self-auto"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            Open in Live Editor
                        </button>
                    </div>

                    <div className="w-full py-2">
                        <RenderMarkdown text={customMarkdown} />
                    </div>
                </div>
            )}
        </div>
    );
}
