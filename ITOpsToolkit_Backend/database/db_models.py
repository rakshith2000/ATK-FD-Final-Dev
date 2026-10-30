# Authors - Viraj Purandare and Vishwas K S
# Created On - September 30, 2025

# Default packages
import os
import sys
import enum
import uuid
from dotenv import load_dotenv

# Third party packages
from sqlalchemy.sql import func
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from sqlalchemy import create_engine, Column, Integer, Float, String, Text, Enum, Boolean, DateTime, UniqueConstraint, ForeignKey
from pgvector.sqlalchemy import Vector

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

# Creation of database is a part of pre-deployment script
# Create the SQLAlchemy engine targeting itops_toolkit_db
DATABASE_URL = f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
# engine = create_engine(DATABASE_URL)
engine = create_engine(
    DATABASE_URL,
    pool_size = 20,
    max_overflow = 20,
    pool_timeout = 60,
    pool_recycle = 1800,
    pool_pre_ping = True,
)


Base = declarative_base()

# Enums
class LLMType(enum.Enum):
    nova = "AWS Nova"
    azure = "Azure OpenAI"
    gemini = "Google Gemini"

class LLMGuards(Enum):
    toxicity = "Toxicity"
    malicious_urls = "MaliciousURLs"
    gibberish = "Gibberish"
    bancode = "Bancode"
    prompt_injection = "PromptInjection"
    anonymization = "Anonymization"
    bias = "Bias"

class ITSMType(enum.Enum):
    servicenow = "ServiceNow"


class ITSMAuthType(enum.Enum):
    service_account = "Service Account"
    bearer_token = "Bearer Token"

class FormType(str, enum.Enum):
    incident_form = "Incident Form"
    change_form = "Change Form"
    problem_form = "Problem Form"

# Define your models here
# Administration models
class LLMInventory(Base):
    __tablename__ = "llm_inventory"
    id = Column(Integer, primary_key = True)
    llm_tag = Column(String(30), unique = True, nullable = False)
    llm_type = Column(Enum(LLMType))
    llm_config = Column(JSONB)
    updated_by = Column(String(50))
    updated_at = Column(DateTime)

class LiteLLMProxy(Base):
    __tablename__ = "litellm_proxy"
    id = Column(Integer, primary_key = True)
    proxy_base_url = Column(String(100), nullable = False)
    proxy_key = Column(String(30), nullable = False)
    updated_by = Column(String(50))
    updated_at = Column(DateTime)

class LLMUsage(Base):
    __tablename__ = "llm_usage"
    id = Column(Integer, primary_key = True)
    timestamp = Column(DateTime, nullable = True)
    user = Column(String(50), nullable = True)
    module = Column(String(50), nullable = False)
    agent = Column(String(50), nullable = False)
    llm_tag = Column(String(30), nullable = False)
    prompt_tokens = Column(Integer)
    cache_tokens = Column(Integer)
    internal_processing_and_output_tokens = Column(Integer)
    total_tokens = Column(Integer, nullable = False)

class SSOClientInventory(Base):
    __tablename__ = "sso_client_inventory"
    id = Column(Integer, primary_key = True)
    client_id = Column(String(30), nullable = False)
    realm_name =  Column(String(30), nullable = False)
    sso_url = Column(String(150), nullable = False)
    client_secret = Column(String(100), nullable = False)
    redirection_url = Column(String(150))
    updated_by = Column(String(50))
    updated_at = Column(DateTime)

    __table_args__ = (UniqueConstraint("client_id", "realm_name", name='_client_realm_uc'),)

class ITSMConnectorInventory(Base):
    __tablename__ = "itsm_connector_inventory"
    id = Column(Integer, primary_key = True)
    itsm_tag = Column(String(30), unique = True, nullable = False)
    itsm_type = Column(Enum(ITSMType))
    itsm_auth_type = Column(Enum(ITSMAuthType))
    itsm_url = Column(String(150), nullable = False)
    itsm_user = Column(String(50))
    itsm_password = Column(String(50))
    bearer_token = Column(String(128))
    itsm_additional_config = Column(JSONB)
    updated_by = Column(String(50))
    updated_at = Column(DateTime)

class ModuleConfigurationInventory(Base):
    __tablename__ = "module_configuration_inventory"
    id = Column(Integer, primary_key = True, autoincrement = True)
    module = Column(String(50), nullable = False)
    parameter = Column(String(50), nullable = False)
    value = Column(Text, nullable = False)

    __table_args__ = (UniqueConstraint("module", "parameter", name = "_module_parameter_uc"),)

# Problem assist models
class ProblemTicketDetailsInventory(Base):
    __tablename__ = "problem_ticket_details_inventory"

    id = Column(String, primary_key = True, default = lambda: str(uuid.uuid4()))
    short_description = Column(String(500), nullable = False)
    description = Column(String(1000), nullable = False)
    associated_incidents = Column(JSONB, nullable = False)
    approval_status = Column(String(20), nullable = True)
    problem_ticket_number = Column(String(20), nullable = True)
    rejection_reason = Column(String(200), nullable = True)
    approver = Column(String(50), nullable = True)
    problem_ticket_link = Column(String(300), nullable = True)
    impact = Column(String(10), nullable = True)
    urgency = Column(String(10), nullable = True)
    priority = Column(String(10), nullable = True)
    state = Column(String(50), nullable = True)
    assigned_to = Column(String(100), nullable = True)
    assignment_group = Column(String(100), nullable = True)
    
    
# Train assist models
class Quiz(Base):
    __tablename__ = "quiz"

    id = Column(Integer, primary_key = True, autoincrement = True)
    quiz_code = Column(String(20))
    user_id = Column(String(50), nullable = True)
    kb_number = Column(String(10), nullable = True)
    start_time = Column(DateTime, nullable = True)
    quiz = Column(JSONB)
    user_response = Column(Text, nullable = True)
    score = Column(Float, nullable = True)

class QuizSummary(Base):
    __tablename__ = "quiz_summary"

    quiz_code = Column(String(20), ForeignKey("quiz.quiz_code"), primary_key = True)
    user_id = Column(String(50), nullable = True)
    summary = Column(Text, nullable = True)


# Knowledge assist models
class KnowledgeArticleInventory(Base):
    __tablename__ = "knowledge_article_inventory"

    id = Column(Integer, primary_key = True, autoincrement = True)
    content = Column(Text, nullable = True)
    embedding = Column(Vector(768), nullable = True)
    kb_metadata = Column(JSONB, nullable = True)

class KnowledgeArticleScoreInventory(Base):
    __tablename__ = "knowledge_article_score_inventory"

    id = Column(Integer, primary_key = True, autoincrement = True)
    kb_number = Column(String(10), nullable = False)
    score_details = Column(JSONB, nullable = False)
    average_score = Column(Float, nullable = False)
    
# Meeting assist models
class MeetingInventory(Base):
    __tablename__ = "meeting_inventory"
    id = Column(String, primary_key = True, default = lambda: str(uuid.uuid4()))
    title = Column(String(255), nullable = False)
    web_meeting_url = Column(Text, nullable = False)
    auth_required = Column(Boolean, default = True)  # Flag for auth/no-auth
    created_at = Column(DateTime(timezone = True), server_default = func.now())
    started_at = Column(DateTime(timezone = True), nullable = True)
    ended_at = Column(DateTime(timezone = True), nullable = True)
    updated_at = Column(DateTime(timezone = True), server_default = func.now(), onupdate = func.now())
    participants = Column(ARRAY(String))
    subject = Column(String(50))
    groups = Column(Text)
    meeting_link_id = Column(String, nullable = True)
    occurrences = Column(Integer, default = 1, nullable = False)

    # Relationships
    meeting_auth_session_public = relationship("MeetingAuthSessionPublic", back_populates = "meeting_inventory", cascade = "all, delete-orphan")
    meeting_transcript_inventory = relationship("MeetingTranscriptInventory", back_populates = "meeting_inventory", cascade = "all, delete-orphan")
    meeting_summary_inventory = relationship("MeetingSummaryInventory", back_populates = "meeting_inventory", cascade = "all, delete-orphan")
    meeting_article_inventory = relationship("MeetingArticleInventory", back_populates = "meeting_inventory", cascade = "all, delete-orphan")

class MeetingAuthSessionPublic(Base):
    __tablename__ = "meeting_auth_session_public"
    id = Column(String, primary_key = True, default = lambda: str(uuid.uuid4()))
    meeting_id = Column(String, ForeignKey("meeting_inventory.id"), nullable = False)
    auth_url = Column(Text, nullable = False)
    auth_code = Column(String(100), nullable = False)
    client_id = Column(String(255), nullable = False)
    access_token = Column(Text, nullable = True)
    refresh_token = Column(Text, nullable = True)
    expires_in = Column(Integer, nullable = True)
    created_at = Column(DateTime(timezone = True), server_default = func.now())

    # Relationships
    meeting_inventory = relationship("MeetingInventory", back_populates = "meeting_auth_session_public")

class MeetingTranscriptInventory(Base):
    __tablename__ = "meeting_transcript_inventory"
    id = Column(String, primary_key = True)
    meeting_id = Column(String, ForeignKey("meeting_inventory.id"), nullable = False)
    transcript_timestamp = Column(DateTime(timezone = True), server_default = func.now())
    content = Column(Text, nullable = False)
    timestamp = Column(DateTime(timezone = True), server_default = func.now())

    # Relationships
    meeting_inventory = relationship("MeetingInventory", back_populates = "meeting_transcript_inventory")

class MeetingSummaryInventory(Base):
    __tablename__ = "meeting_summary_inventory"
    id = Column(String, primary_key = True, default = lambda: str(uuid.uuid4()))
    meeting_id = Column(String, ForeignKey("meeting_inventory.id"), nullable = False)
    title = Column(String(500), nullable = True)
    content = Column(JSONB, nullable = True)
    created_at = Column(DateTime(timezone = True), server_default = func.now())

    # Relationships
    meeting_inventory = relationship("MeetingInventory", back_populates = "meeting_summary_inventory")

class MeetingArticleInventory(Base):
    __tablename__ = "meeting_article_inventory"
    id = Column(String, primary_key = True, default = lambda: str(uuid.uuid4()))
    meeting_id = Column(String, ForeignKey("meeting_inventory.id"), nullable = False)
    title = Column(String(500), nullable = False)
    content = Column(JSONB, nullable = True)
    created_at = Column(DateTime(timezone = True), server_default = func.now())
    archived = Column(Boolean, default = False)

    # Relationships
    meeting_inventory = relationship("MeetingInventory", back_populates = "meeting_article_inventory")

class MIMInventory(Base):
    __tablename__ = "mim_inventory"
    id = Column(String, primary_key = True, default = lambda: str(uuid.uuid4()))
    incident_number = Column(String(20), nullable = False)
    meeting_details = Column(JSONB, nullable = False)
    incident_details = Column(JSONB, nullable = True)
    incident_summary = Column(JSONB)
    invitees = Column(ARRAY(String), nullable = True)
    participants = Column(ARRAY(String), nullable = True)
    conversation_history = Column(JSONB, nullable = True)
    ticket_state = Column(String(20), nullable = True)
    meeting_start_datetime = Column(DateTime(timezone = True), nullable = True)

class FormInventory(Base):
    __tablename__ = "form_inventory"
    id = Column(String, primary_key = True, default = lambda: str(uuid.uuid4()))
    name = Column(Enum(FormType), nullable = False)
    form = Column(JSONB, nullable = False)

def create_tables():
    # Create tables using Base.metadata.create_all()
    Base.metadata.create_all(engine)
    print(f"Database '{DB_NAME}' and tables created or already exist.")

# create_tables()
