# Code Changes Documentation in demo

This document outlines the modifications made across the **ITOpsToolkit Backend** repositories.

## Overview

| # | Module | Status |
|---|--------|--------|
| 1 | ServiceNow MCP (Backend) | Updated |


## 1. ServiceNow MCP (Backend)

### Hardcode User ID

| Field | Details |
|-------|---------|
| **File** | `ITOpsToolkit_Backend/mcp_servers/servicenow_mcp.py` |
| **Line** | 231 |
| **Change** | Add hardcoded user value |

```python
user = "452971"
```

## Summary of Files Modified

| # | File | Change |
|---|------|--------|
| 1 | `servicenow_mcp.py` (Line 231) | Added hardcoded `user = "452971"` |
| 2 | `servicenow_mcp.py` | Added dev-only fallback for the demo user's missing knowledge criteria |

- Backend change is isolated to the ServiceNow MCP server module.

## Demo knowledge access fallback

When the ServiceNow criteria lookup returns no records, the specified demo user can use
(`sys_id` `5a75e9522f0cdb10ab179e2fafa4e332`) criteria
`fca8ac73c35fe550132b9fd4e40131e5` to resolve readable knowledge bases. This backend
fallback is enabled only when `ATK_ENVIRONMENT` is `dev` or `development`; leave that
variable unset or use another value outside the development environment. The frontend
Knowledge Browser fallback is limited to `VITE_APP_PIPELINE_STAGE=development`.









