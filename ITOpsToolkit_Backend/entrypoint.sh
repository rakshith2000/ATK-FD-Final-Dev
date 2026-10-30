#!/bin/sh
set -e

#To start the ServiceNow MCP server
echo "Starting MCP Server..."
# python3 mcp_servers/servicenow_mcp.py &
nohup python3 mcp_servers/servicenow_mcp.py > servicenow_mcp.log 2>&1 &

echo "Starting MIM"
python3 modules/mim_assist/utils/app.py &
 
echo "Starting FastAPI Server..."
exec uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2
