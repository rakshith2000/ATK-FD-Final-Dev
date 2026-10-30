import json
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def handler(event, context):
    """Lambda handler - generates response on demand at runtime."""
    logger.info("Event received: %s", json.dumps(event))

    http_method = event.get("httpMethod", "GET")
    path = event.get("path", "/")
    body = event.get("body")

    if body:
        try:
            body = json.loads(body)
        except (json.JSONDecodeError, TypeError):
            pass

    response_body = {
        "message": "Request processed successfully",
        "method": http_method,
        "path": path,
        "function_name": context.function_name,
        "request_id": context.aws_request_id,
    }

    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json",
            "X-Request-Id": context.aws_request_id,
        },
        "body": json.dumps(response_body),
    }
