#!/usr/bin/env sh

# Installation of GCC for PostgreSQL psycopg2 package
sh $(pwd)/install_gcc.sh

# Installation and Configuration of PostgreSQL database
sh $(pwd)/install_postgresql.sh

# Create virtual environment and activate
cd $(pwd)/..
python3 -m venv .venv
source .venv/bin/activate
pip install -r $(pwd)/../requirements.txt

# Installation of UV package for MCP
sh $(pwd)/install_fastmcp.sh
