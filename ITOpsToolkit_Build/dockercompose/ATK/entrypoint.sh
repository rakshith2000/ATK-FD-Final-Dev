#!/bin/sh
set -e

# echo "Running init_db..."
# python3 database/init_db.py || echo "init_db DONE, continuing..."

# echo "Running articles_connector..."
# python3 articles_connector.py initial || echo "articles_connector DONE, continuing..."

#To start the MCP server
echo "Starting MCP Server..."
python3 mcp_servers/servicenow_mcp.py &

echo "Starting FastAPI Server..."

#exec uvicorn main:app --host 0.0.0.0 --port 8000
##for 4 workers uncomment below
exec uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2
