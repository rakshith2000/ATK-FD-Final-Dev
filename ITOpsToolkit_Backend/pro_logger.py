# Author - Viraj Purandare, Vishwas K S and Hemanth Tubachi
# Created On - December 2, 2025

# Default packages
import os
import json
import datetime

import logging
from logging.handlers import RotatingFileHandler

# Global variables
SCRIPT_PATH = os.path.dirname(__file__)

# Application logger
class AppLogger(logging.Formatter):
    def format(self, record):
        base = {
                "timestamp": datetime.datetime.now(datetime.UTC).isoformat() + "Z",
                "severity": record.levelname,
                "is_exception": False,
                "message": record.getMessage()
                }

        # Recommended to send module_name, component_type and component_name in `extra`
        if hasattr(record, "extra") and isinstance(record.extra, dict):
            base.update(record.extra)

        return json.dumps(base, ensure_ascii = False)

# Audit logger
class AuditLogger(logging.Formatter):
    def format(self, record):
        base = {
                "timestamp": datetime.datetime.now(datetime.UTC).isoformat() + "Z",
                "severity": record.levelname,
                "message": record.getMessage()
                }

        # Recommended to send user_id, api, api_method, response_code and exec_duration_in_sec in `extra`
        if hasattr(record, "extra") and isinstance(record.extra, dict):
            base.update(record.extra)

        return json.dumps(base, ensure_ascii = False)

# Agentic logger
class AgenticLogger(logging.Formatter):
    def format(self, record):
        base = {
                "timestamp": datetime.datetime.now(datetime.UTC).isoformat() + "Z",
                "severity": record.levelname,
                "message": record.getMessage()
                }

        # Recommended to send user_id, mcp_server, tool_name, exec_error (optional) `extra`
        if hasattr(record, "extra") and isinstance(record.extra, dict):
            base.update(record.extra)

        return json.dumps(base, ensure_ascii = False)

# Configure loggers with default settings
def configure_logger(logger_name, logger_file, formatter, log_severity = logging.INFO, max_bytes = 50_000_000, backup_count = 10):
    log_path = os.path.join(SCRIPT_PATH, "logs", logger_file)

    logger = logging.getLogger(logger_name)
    handler = RotatingFileHandler(log_path, maxBytes = max_bytes, backupCount = backup_count)
    handler.setFormatter(formatter)

    logger.setLevel(log_severity)
    logger.addHandler(handler)
    logger.propagate = False

    return logger

# Log event interface
def log_event(logger, severity, message, **extra):
    record = logging.LogRecord(logger.name, severity, __file__, 0, message, None, None)
    record.extra = extra
    logger.handle(record)


application_logger = configure_logger("application_logs", "application.json.log", AppLogger())
audit_logger = configure_logger("audit_logs", "audit.json.log", AuditLogger())
agentic_logger = configure_logger("agentic_logs", "agentic.json.log", AgenticLogger())
# log_event(application_logger, logging.INFO, is_exception = True, "Vishwas K S unable to apply leave_request", module_name = "apply_leave", component_type = "button", component_name = "Submit")
# log_event(audit_logger, logging.INFO, "Access", user_id = "12345", api = "/knowledge_assist/change", api_method = "POST", response_code = 500, exec_duration_in_sec = 2)
# log_event(agentic_logger, logging.ERROR, "", mcp_server = "windows", tool_name = "start_windows_service", exec_error = "Permission denied")