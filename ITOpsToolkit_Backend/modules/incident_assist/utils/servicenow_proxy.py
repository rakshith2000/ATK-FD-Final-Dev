import os
import json
import requests

import core_crud
import db_session
import system_config_ia as scf

from pro_logger import (
    log_event,
    application_logger
)


class ServiceNow:

    def __init__(self):
        self.headers = {
            "Content-Type": "application/json"
        }

    def _request(self, method, url, itsm_details, **kwargs):
        """
        Generic ServiceNow request wrapper.
        """

        if itsm_details.itsm_auth_type.value == "Service Account":

            kwargs["auth"] = (
                itsm_details.itsm_user,
                itsm_details.itsm_password
            )

        else:

            headers = kwargs.get("headers", {}).copy()

            headers["Authorization"] = (
                f"Bearer {itsm_details.bearer_token}"
            )

            kwargs["headers"] = headers

        return getattr(requests, method.lower())(
            url,
            **kwargs
        )

    def execute(self, method, table_name, query_string = "", payload = None, sys_id = None, module_name = "itsm"):
        """
        Pure proxy to ServiceNow.

        Resolves the ITSM connector from system config (single-tag semantics),
        forwards the request, and returns ``(status_code, body)`` exactly as
        ServiceNow responded - for both success and failure cases.
        """

        db_local_session = db_session.get_db()

        try:

            configs = scf.get_system_config()

            itsm_tag = next(
                (tag.strip() for tag in configs["itsm_tags"] if tag and tag.strip()),
                None
            )

            if not itsm_tag:
                return (400, {"error": "No ITSM connector tag configured."})

            itsm_connector_details = core_crud.get_itsm_connector_details_with_creds(
                db_local_session,
                itsm_tag
            )

            if not itsm_connector_details:
                return (404, {"error": f"ITSM connector '{itsm_tag}' not found."})

            target_url = (f"{itsm_connector_details.itsm_url}" f"/api/now/table/{table_name}")

            if sys_id:
                target_url += f"/{sys_id}"

            if query_string:
                target_url += f"?{query_string}"

            response = self._request(
                method = method.lower(),
                url = target_url,
                itsm_details = itsm_connector_details,
                data = json.dumps(payload) if payload else None,
                headers = self.headers,
                verify = False
            )

            try:
                body = response.json()

            except Exception:
                body = {"text": response.text}

            # Echo ServiceNow's response verbatim - success or failure.
            return (response.status_code, body)

        except Exception as e:

            log_event(
                application_logger,
                "ERROR",
                str(e),
                module_name = module_name,
                component_type = "itsm_connector_operations",
                component_name = "servicenow_execute"
            )

            return (500, {"error": str(e)})

        finally:
            db_local_session.close()

    def get_query(self, table_name, query_string = ""):
        return self.execute(method = "get", table_name = table_name, query_string = query_string)

    def post_query(self, table_name, payload):
        return self.execute(method = "post", table_name = table_name, payload = payload)

    def patch_query(self, table_name, sys_id, payload):
        return self.execute(method = "patch", table_name = table_name, sys_id = sys_id, payload = payload)

    def put_query(self, table_name, sys_id, payload):
        return self.execute(method = "put", table_name = table_name, sys_id = sys_id, payload = payload)

    # def delete_query(self, table_name, sys_id):
    #     return self.execute(method = "delete", table_name = table_name, sys_id = sys_id)
