# Author - Viraj Purandare
# Created On - September 30, 2025

# Default packages
import os
import sys
from dotenv import load_dotenv

# Third party packages
from databases import Database
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.declarative import declarative_base

# Global variables and custom packages
SCRIPT_PATH = os.path.dirname(__file__)
ROOT_PATH = SCRIPT_PATH.split("database")[0].strip()

sys.path.append(ROOT_PATH)

from vault import Vault
load_dotenv()
vault_type_file = os.path.join(ROOT_PATH, "config", ".vault_type")
load_dotenv(vault_type_file)
VAULT_TYPE = os.getenv("VAULT_TYPE")

# Database configuration
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")


vault_obj = Vault(VAULT_TYPE)
(status, value) = vault_obj.read_secret("db_secret")

if not status:
    print("ERROR: Database password missing in the vault. Use tag name - db_secret")
    exit()
else:
    DB_USER = value[0]
    DB_PASSWORD = value[1]

DATABASE_URL = f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# SQLAlchemy setup
# engine = create_engine(DATABASE_URL)
engine = create_engine(
    DATABASE_URL,
    pool_size = 20,
    max_overflow = 20,
    pool_timeout = 60,
    pool_recycle = 1800,
    pool_pre_ping = True,
)
session_local = sessionmaker(autocommit = False, autoflush = False, bind = engine)
Base = declarative_base()

# Async database connection
database = Database(DATABASE_URL)
metadata = MetaData()

# Dependency to get database session
def get_db():
    db = session_local()
    try:
        return db
    finally:
        db.close()
