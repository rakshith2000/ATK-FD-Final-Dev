import os
import re
import logging
import json
import time
import urllib.parse

import requests

import core_crud
import db_session
import system_config_ia as scf

from pro_logger import (
    log_event,
    application_logger
)


# ═══════════════════════════════════════════════════════════════════════════════
#  SCOPE ENFORCEMENT
#
#  Under service-account auth every request reaches ServiceNow as the same user,
#  so ServiceNow's own ACLs cannot separate one ATK user from another. ATK 2.1
#  solved this by never letting the browser choose the query: its typed endpoints
#  built every sysparm_query server-side from the Keycloak identity
#  (incident_assist_utils.list_user_assigned_incidents and friends).
#
#  The 2.3 generic proxy accepts table_name + sysparm_query from the browser, so
#  that guarantee is lost. This layer restores it: the caller is resolved from
#  the validated Keycloak token, and a mandatory ownership clause is appended to
#  whatever query the browser sent. Tables are deny-by-default.
#
#  This is 2.1-equivalent security, NOT ServiceNow-ACL equivalence. Field-level
#  ACLs and data separation rules still do not apply - only per-user OAuth gives
#  you those. Set the frontend's serviceNow.api.mode to "direct" when you move.
#
#  Kill switch: SNOW_SCOPE_ENFORCEMENT=off  (backend env var - deliberately NOT
#  client-readable config, so a browser can never influence it).
# ═══════════════════════════════════════════════════════════════════════════════

SCOPE_ENFORCEMENT = os.environ.get("SNOW_SCOPE_ENFORCEMENT", "on").strip().lower() not in ("off", "false", "0")
SCOPE_CACHE_TTL = int(os.environ.get("SNOW_SCOPE_CACHE_TTL", "60"))

# Tables whose rows belong to a user. Values are the reference fields that tie a
# record to its owner; "assignment_group" is expanded to the caller's groups.
OWNERSHIP_TABLES = {
    "incident":       ["assigned_to", "assignment_group", "opened_by", "caller_id"],
    "problem":        ["assigned_to", "assignment_group", "opened_by"],
    "problem_task":   ["assigned_to", "assignment_group", "opened_by"],
    "sc_request":     ["assigned_to", "assignment_group", "opened_by", "requested_for"],
    "sc_task":        ["assigned_to", "assignment_group", "opened_by"],
    "change_request": ["assigned_to", "assignment_group", "opened_by", "requested_by"],
    "task":           ["assigned_to", "assignment_group", "opened_by"],
}

# Child tables that carry no owner of their own - they inherit visibility from a
# parent record. The tuple is (query field holding the parent sys_id, parent
# table to validate against). "task" is the base table of incident / problem /
# sc_request / change_request and carries assigned_to, assignment_group and
# opened_by, so one lookup against it covers all four.
PARENT_SCOPED_TABLES = {
    "sys_attachment":    [("table_sys_id", None)],   # parent table comes from the table_name term
    "sys_journal_field": [("element_id", "task")],
    "sys_audit":         [("documentkey", "task")],
    "task_sla":          [("task", "task")],
    "em_alert":          [("incident", "incident"), ("problem", "problem")],
}

# Reference / metadata tables. These hold no per-user records, so the service
# account reading them is equivalent to what 2.1 exposed through its typed
# endpoints. Allowed without an ownership clause.
#
# NOTE: sys_user is included because the app needs the signed-in user's sys_id
# and group-member name lists. That does mean a determined caller can enumerate
# the staff directory (names / emails / usernames) - the same exposure 2.1 had.
# Narrow it here if your security review requires it.
REFERENCE_TABLES = {
    "sys_user", "sys_user_group", "sys_user_grmember", "sys_user_has_role",
    "sys_choice", "sys_db_object", "sys_dictionary",
    "cmdb_ci", "cmdb_ci_server", "cmdb_ci_computer", "cmdb_rel_ci",
    "user_criteria", "kb_uc_can_read_mtom", "kb_uc_can_contribute_mtom",
    "kb_knowledge_base", "kb_category",
}

# Knowledge articles are scoped by knowledge base, resolved through the
# user_criteria -> kb_uc_can_read_mtom chain the frontend already walks.
KB_TABLE = "kb_knowledge"

_scope_cache = {}


def _cache_get(key):
    hit = _scope_cache.get(key)
    if not hit:
        return None
    (value, expires_at) = hit
    if time.time() > expires_at:
        _scope_cache.pop(key, None)
        return None
    return value


def _cache_put(key, value):
    _scope_cache[key] = (value, time.time() + SCOPE_CACHE_TTL)
    return value


class ScopeDenied(Exception):
    """Raised when a proxied request cannot be safely scoped to the caller."""

    def __init__(self, message, detail = ""):
        super().__init__(message)
        self.message = message
        self.detail = detail

    def as_response(self):
        return (403, {
            "error": {
                "message": self.message,
                "detail": self.detail,
            },
            "status": "failure",
            # Marker for the HTTP layer. A 403 raised here already carries an
            # accurate reason, so it must NOT be relabelled as an upstream
            # credential failure the way a genuine ServiceNow 401/403 is.
            "scope_denied": True,
        })


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

    def _resolve_connector(self, db_local_session):
        """
        Resolve the ITSM connector configured for this deployment.

        Returns ``(itsm_connector_details, None)`` on success, or
        ``(None, (status_code, body))`` when the connector cannot be resolved,
        so callers can hand that error tuple straight back to the client.
        """

        configs = scf.get_system_config()

        itsm_tag = next(
            (tag.strip() for tag in (configs.get("itsm_tags") or []) if tag and tag.strip()),
            None
        )

        if not itsm_tag:
            return (None, (400, {"error": "No ITSM connector tag configured."}))

        itsm_connector_details = core_crud.get_itsm_connector_details_with_creds(
            db_local_session,
            itsm_tag
        )

        if not itsm_connector_details:
            return (None, (404, {"error": f"ITSM connector '{itsm_tag}' not found."}))

        return (itsm_connector_details, None)

    # ── scope enforcement helpers ────────────────────────────────────────────

    def _raw_get(self, itsm_details, table_name, query_string):
        """
        Unscoped GET used only by the scope resolver itself (looking up the
        caller's sys_id, groups and readable knowledge bases). Routing these
        back through execute() would recurse.
        """

        url = f"{itsm_details.itsm_url}/api/now/table/{table_name}"

        if query_string:
            url += f"?{query_string}"

        response = self._request(
            method = "get",
            url = url,
            itsm_details = itsm_details,
            headers = self.headers,
            verify = False
        )

        if response.status_code >= 400:
            raise ScopeDenied(
                "Could not establish the caller's ServiceNow identity.",
                f"Lookup on {table_name} returned {response.status_code}."
            )

        return response.json().get("result", [])

    def _attachment_metadata(self, itsm_details, attachment_sys_id):
        """
        Resolve an attachment's parent record through the Attachment API
        (/api/now/attachment/<sys_id>) rather than the sys_attachment table.

        ServiceNow gates these separately: a service account can hold rights to
        the Attachment API while having no Table API read ACL on sys_attachment.
        Querying the table in that case returns an empty result, which is
        indistinguishable from "this attachment does not exist" and produced a
        misleading denial.

        Returns the metadata dict, or None if it cannot be read.
        """

        url = f"{itsm_details.itsm_url}/api/now/attachment/{attachment_sys_id}"

        response = self._request(
            method = "get",
            url = url,
            itsm_details = itsm_details,
            headers = self.headers,
            verify = False
        )

        if response.status_code >= 400:
            return None

        try:
            result = response.json().get("result")
        except Exception:
            return None

        # /attachment/<sys_id> returns a single object; the list form
        # (/attachment?sys_id=...) returns a one-element array.
        if isinstance(result, list):
            result = result[0] if result else None

        return result if isinstance(result, dict) else None

    def _caller_identity(self, itsm_details, caller):
        """
        Resolve the Keycloak username to a ServiceNow sys_id plus the sys_ids of
        the assignment groups they belong to. Mirrors what 2.1's
        get_user_details / list_user_assignment_groups did server-side.
        """

        cached = _cache_get(f"identity::{caller}")
        if cached:
            return cached

        users = self._raw_get(
            itsm_details,
            "sys_user",
            "sysparm_query=" + urllib.parse.quote(f"user_name={caller}^ORemail={caller}")
            + "&sysparm_fields=sys_id&sysparm_limit=1&sysparm_exclude_reference_link=true"
        )

        if not users:
            raise ScopeDenied(
                "No ServiceNow user matches the signed-in account.",
                f"Looked up user_name / email '{caller}'. The account must exist in sys_user to see any records."
            )

        user_sys_id = users[0].get("sys_id")

        members = self._raw_get(
            itsm_details,
            "sys_user_grmember",
            "sysparm_query=" + urllib.parse.quote(f"user={user_sys_id}")
            + "&sysparm_fields=group&sysparm_exclude_reference_link=true&sysparm_limit=200"
        )

        group_ids = []
        for row in members:
            group = row.get("group")
            # with exclude_reference_link the field is a plain sys_id string,
            # but display_value=all would make it a dict - handle both.
            if isinstance(group, dict):
                group = group.get("value")
            if group:
                group_ids.append(group)

        return _cache_put(f"identity::{caller}", (user_sys_id, group_ids))

    def _readable_kb_ids(self, itsm_details, user_sys_id):
        """Knowledge bases the caller may read, via user_criteria -> kb_uc_can_read_mtom."""

        cached = _cache_get(f"kb::{user_sys_id}")
        if cached is not None:
            return cached

        criteria = self._raw_get(
            itsm_details,
            "user_criteria",
            "sysparm_query=" + urllib.parse.quote(f"userLIKE{user_sys_id}")
            + "&sysparm_fields=sys_id&sysparm_exclude_reference_link=true&sysparm_limit=200"
        )

        criteria_ids = [c.get("sys_id") for c in criteria if c.get("sys_id")]

        if not criteria_ids:
            return _cache_put(f"kb::{user_sys_id}", [])

        mappings = self._raw_get(
            itsm_details,
            "kb_uc_can_read_mtom",
            "sysparm_query=" + urllib.parse.quote(f"user_criteriaIN{','.join(criteria_ids)}")
            + "&sysparm_fields=kb_knowledge_base&sysparm_exclude_reference_link=true&sysparm_limit=500"
        )

        kb_ids = []
        for row in mappings:
            kb = row.get("kb_knowledge_base")
            if isinstance(kb, dict):
                kb = kb.get("value")
            if kb and kb not in kb_ids:
                kb_ids.append(kb)

        return _cache_put(f"kb::{user_sys_id}", kb_ids)

    def _allowed_kb_ids(self, itsm_details, user_sys_id):
        """
        Knowledge bases the caller may read.

        Two sources, and missing the second one causes false denials:
          1. bases granted through the caller's own user_criteria
          2. bases that carry NO read criteria at all - in ServiceNow those are
             open to every knowledge user, and because they have no rows in
             kb_uc_can_read_mtom they can never show up in (1).
        """

        cached = _cache_get(f"kballowed::{user_sys_id}")
        if cached is not None:
            return cached

        granted = set(self._readable_kb_ids(itsm_details, user_sys_id))

        all_bases = self._raw_get(
            itsm_details,
            "kb_knowledge_base",
            "sysparm_fields=sys_id&sysparm_limit=500&sysparm_exclude_reference_link=true"
        )
        all_ids = {b.get("sys_id") for b in all_bases if b.get("sys_id")}

        restricted_rows = self._raw_get(
            itsm_details,
            "kb_uc_can_read_mtom",
            "sysparm_fields=kb_knowledge_base&sysparm_limit=2000&sysparm_exclude_reference_link=true"
        )

        restricted = set()
        for row in restricted_rows:
            value = row.get("kb_knowledge_base")
            if isinstance(value, dict):
                value = value.get("value")
            if value:
                restricted.add(value)

        return _cache_put(f"kballowed::{user_sys_id}", sorted(granted | (all_ids - restricted)))

    @staticmethod
    def _ownership_clause(table_name, user_sys_id, group_ids):
        """`assigned_to=me ^OR assignment_group IN my-groups ^OR opened_by=me`"""

        parts = []

        for field in OWNERSHIP_TABLES[table_name]:
            if field == "assignment_group":
                if group_ids:
                    parts.append(f"assignment_groupIN{','.join(group_ids)}")
            else:
                parts.append(f"{field}={user_sys_id}")

        return "^OR".join(parts)

    def _parent_visible(self, itsm_details, parent_table, parent_sys_id, user_sys_id, group_ids):
        """
        Single decision point for "may this caller see record X of table Y".

        Attachments, journal entries, audit rows and SLAs all inherit visibility
        from a parent, and that parent is not always a ticket - Knowledge Assist
        attaches images to kb_knowledge articles, which have no assigned_to or
        assignment_group at all. Those are judged on knowledge-base readability
        instead, the same rule applied to the articles themselves.
        """

        if not parent_sys_id:
            return False

        if parent_table == KB_TABLE:
            # Resolve the article's knowledge base, then test readability.
            # Filtering the article query by an IN list would hide the reason a
            # lookup came back empty (wrong base vs. article does not exist).
            rows = self._raw_get(
                itsm_details,
                KB_TABLE,
                "sysparm_query=" + urllib.parse.quote(f"sys_id={parent_sys_id}")
                + "&sysparm_fields=kb_knowledge_base&sysparm_limit=1&sysparm_exclude_reference_link=true"
            )

            if not rows:
                return False

            kb_base = rows[0].get("kb_knowledge_base")
            if isinstance(kb_base, dict):
                kb_base = kb_base.get("value")

            return bool(kb_base) and kb_base in self._allowed_kb_ids(itsm_details, user_sys_id)

        # Anything task-derived (incident, problem, sc_request, change_request,
        # sc_req_item, *_task ...) is reachable through the task base table,
        # which carries assigned_to / assignment_group / opened_by.
        if parent_table not in OWNERSHIP_TABLES:
            parent_table = "task"

        clause = self._ownership_clause(parent_table, user_sys_id, group_ids)

        rows = self._raw_get(
            itsm_details,
            parent_table,
            "sysparm_query=" + urllib.parse.quote(f"sys_id={parent_sys_id}^{clause}")
            + "&sysparm_fields=sys_id&sysparm_limit=1&sysparm_exclude_reference_link=true"
        )

        return bool(rows)

    @staticmethod
    def _split_query(query_string):
        """query_string -> (list of (key, value) pairs, sysparm_query value)."""

        pairs = urllib.parse.parse_qsl(query_string or "", keep_blank_values = True)
        snow_query = next((v for (k, v) in pairs if k == "sysparm_query"), "")
        return (pairs, snow_query)

    @staticmethod
    def _rebuild_query(pairs, snow_query):
        out = [(k, v) for (k, v) in pairs if k != "sysparm_query"]
        if snow_query:
            out.insert(0, ("sysparm_query", snow_query))
        return urllib.parse.urlencode(out)

    def _parent_in_scope(self, itsm_details, table_name, snow_query, user_sys_id, group_ids):
        """
        Child tables (attachments, journal entries, audit, SLA, alerts) carry no
        owner. Require the parent reference in the query and confirm the parent
        record is one the caller can see.
        """

        terms = dict(
            part.split("=", 1)
            for part in re.split(r"\^(?:OR|NQ)?", snow_query)
            if "=" in part and not part.startswith("sysparm")
        )

        for (field, fixed_parent) in PARENT_SCOPED_TABLES[table_name]:
            parent_sys_id = terms.get(field)
            if not parent_sys_id:
                continue

            parent_table = fixed_parent
            if parent_table is None:
                # sys_attachment names its parent table in the same query
                parent_table = terms.get("table_name", "task")

            cache_key = f"parent::{user_sys_id}::{parent_table}::{parent_sys_id}"
            visible = _cache_get(cache_key)

            if visible is None:
                visible = _cache_put(
                    cache_key,
                    self._parent_visible(itsm_details, parent_table, parent_sys_id, user_sys_id, group_ids)
                )

            if visible:
                return

            raise ScopeDenied(
                "You do not have access to the parent record.",
                f"{parent_table} {parent_sys_id} is not visible to you."
            )

        raise ScopeDenied(
            f"Requests to '{table_name}' must identify a parent record.",
            "Expected one of: " + ", ".join(f for (f, _) in PARENT_SCOPED_TABLES[table_name])
        )

    def _scope_query(self, itsm_details, table_name, query_string, caller):
        """
        Returns the query_string with a mandatory ownership clause applied.
        Raises ScopeDenied when the table is not allowed or cannot be scoped.
        """

        if table_name in REFERENCE_TABLES:
            return query_string

        (pairs, snow_query) = self._split_query(query_string)

        # ServiceNow's encoded-query grammar has no parentheses. Appending
        # "^a^ORb" to an existing query yields "(existing) AND (a OR b)", which
        # is what we want - but "NQ" starts a brand new top-level query, so a
        # trailing scope clause would only constrain the last segment. Reject it
        # rather than apply a control that silently does not hold.
        if re.search(r"\^NQ", snow_query, flags = re.IGNORECASE):
            raise ScopeDenied(
                "Queries using the NQ (new query) operator are not allowed.",
                "NQ creates a second top-level query that a scope filter cannot constrain. Split it into separate requests."
            )

        (user_sys_id, group_ids) = self._caller_identity(itsm_details, caller)

        if table_name in OWNERSHIP_TABLES:
            clause = self._ownership_clause(table_name, user_sys_id, group_ids)
            snow_query = f"{snow_query}^{clause}" if snow_query else clause
            return self._rebuild_query(pairs, snow_query)

        if table_name == KB_TABLE:
            kb_ids = self._allowed_kb_ids(itsm_details, user_sys_id)
            if not kb_ids:
                raise ScopeDenied(
                    "You have no readable knowledge bases in ServiceNow.",
                    "No user_criteria records grant this account read access, and every knowledge base carries read criteria."
                )
            clause = f"kb_knowledge_baseIN{','.join(kb_ids)}"
            snow_query = f"{snow_query}^{clause}" if snow_query else clause
            return self._rebuild_query(pairs, snow_query)

        if table_name in PARENT_SCOPED_TABLES:
            self._parent_in_scope(itsm_details, table_name, snow_query, user_sys_id, group_ids)
            return query_string

        raise ScopeDenied(
            f"Table '{table_name}' is not available through the ServiceNow proxy.",
            "Add it to REFERENCE_TABLES or OWNERSHIP_TABLES in servicenow_proxy.py if this is intentional."
        )

    @staticmethod
    def _body(response):
        """
        ServiceNow returns JSON on both success and failure, but an upstream
        gateway or a 5xx can still return HTML. Fall back to the raw text so the
        caller always gets something serialisable.
        """

        try:
            return response.json()

        except Exception:
            return {"text": response.text}

    def execute(self, method, table_name, query_string = "", payload = None, sys_id = None, module_name = "itsm", caller = None):
        """
        Pure proxy to ServiceNow's Table API.

        Resolves the ITSM connector from system config (single-tag semantics),
        forwards the request, and returns ``(status_code, body)`` exactly as
        ServiceNow responded - for both success and failure cases.

        ``caller`` is the Keycloak username of the signed-in user. When set, the
        request is restricted to records that user may see (see SCOPE
        ENFORCEMENT at the top of this file). Internal callers leave it None and
        keep the previous unrestricted behaviour - only the HTTP proxy routes,
        which are reachable from a browser, pass it.
        """

        db_local_session = db_session.get_db()

        try:

            (itsm_connector_details, error) = self._resolve_connector(db_local_session)

            if error:
                return error

            if caller and SCOPE_ENFORCEMENT:
                try:
                    query_string = self._scope_query(itsm_connector_details, table_name, query_string, caller)
                except ScopeDenied as denial:
                    log_event(
                        application_logger,
                        logging.WARNING,
                        f"Scope denied for {caller} on {table_name} - {denial.message}",
                        module_name = module_name,
                        component_type = "itsm_connector_operations",
                        component_name = "servicenow_scope_enforcement"
                    )
                    return denial.as_response()

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

            # Echo ServiceNow's response verbatim - success or failure.
            return (response.status_code, self._body(response))

        except Exception as e:

            log_event(
                application_logger,
                logging.ERROR,
                str(e),
                module_name = module_name,
                component_type = "itsm_connector_operations",
                component_name = "servicenow_execute"
            )

            return (500, {"error": str(e)})

        finally:
            db_local_session.close()

    def execute_stats(self, table_name, query_string = "", module_name = "itsm", caller = None):
        """
        Pure proxy to ServiceNow's Aggregate API (``/api/now/stats/<table>``).

        Used for ``sysparm_count`` / ``sysparm_group_by`` rollups, which the
        Table API cannot serve. Same contract as :meth:`execute`.

        Counts leak information just as rows do, so the same ownership clause is
        applied here - an unscoped count would reveal how many records exist
        outside the caller's scope.
        """

        db_local_session = db_session.get_db()

        try:

            (itsm_connector_details, error) = self._resolve_connector(db_local_session)

            if error:
                return error

            if caller and SCOPE_ENFORCEMENT:
                try:
                    query_string = self._scope_query(itsm_connector_details, table_name, query_string, caller)
                except ScopeDenied as denial:
                    log_event(
                        application_logger,
                        logging.WARNING,
                        f"Scope denied for {caller} on stats/{table_name} - {denial.message}",
                        module_name = module_name,
                        component_type = "itsm_connector_operations",
                        component_name = "servicenow_scope_enforcement"
                    )
                    return denial.as_response()

            target_url = (f"{itsm_connector_details.itsm_url}" f"/api/now/stats/{table_name}")

            if query_string:
                target_url += f"?{query_string}"

            response = self._request(
                method = "get",
                url = target_url,
                itsm_details = itsm_connector_details,
                headers = self.headers,
                verify = False
            )

            return (response.status_code, self._body(response))

        except Exception as e:

            log_event(
                application_logger,
                logging.ERROR,
                str(e),
                module_name = module_name,
                component_type = "itsm_connector_operations",
                component_name = "servicenow_execute_stats"
            )

            return (500, {"error": str(e)})

        finally:
            db_local_session.close()

    def _attachment_parent_in_scope(self, itsm_details, attachment_sys_id, caller):
        """
        Attachments are addressed by their own sys_id, which says nothing about
        who may read them. Resolve the attachment's parent record first, then
        apply the same ownership test used for the parent table.
        """

        (user_sys_id, group_ids) = self._caller_identity(itsm_details, caller)

        metadata = self._attachment_metadata(itsm_details, attachment_sys_id)

        if not metadata:
            raise ScopeDenied(
                "Attachment not found.",
                f"The Attachment API returned no record for sys_id {attachment_sys_id}."
            )

        parent_table = metadata.get("table_name") or "task"
        parent_sys_id = metadata.get("table_sys_id")

        cache_key = f"parent::{user_sys_id}::{parent_table}::{parent_sys_id}"
        visible = _cache_get(cache_key)

        if visible is None:
            visible = _cache_put(
                cache_key,
                self._parent_visible(itsm_details, parent_table, parent_sys_id, user_sys_id, group_ids)
            )

        if not visible:
            raise ScopeDenied(
                "You do not have access to this attachment.",
                f"Its parent {parent_table} record is not visible to you."
            )

    def execute_attachment_download(self, sys_id, module_name = "itsm", caller = None):
        """
        Proxy to ServiceNow's Attachment API binary endpoint
        (``/api/now/attachment/<sys_id>/file``).

        The body here is the file itself, not JSON, so this returns
        ``(status_code, content_bytes, headers)`` instead of the usual
        two-tuple. ``headers`` carries only what the browser needs to save the
        file. On an error status ServiceNow replies with JSON, and the bytes are
        passed through unchanged for the caller to decode.
        """

        db_local_session = db_session.get_db()

        try:

            (itsm_connector_details, error) = self._resolve_connector(db_local_session)

            if error:
                (code, body) = error
                return (code, json.dumps(body).encode(), {"Content-Type": "application/json"})

            if caller and SCOPE_ENFORCEMENT:
                try:
                    self._attachment_parent_in_scope(itsm_connector_details, sys_id, caller)
                except ScopeDenied as denial:
                    log_event(
                        application_logger,
                        logging.WARNING,
                        f"Scope denied for {caller} on attachment {sys_id} - {denial.message}",
                        module_name = module_name,
                        component_type = "itsm_connector_operations",
                        component_name = "servicenow_scope_enforcement"
                    )
                    (code, body) = denial.as_response()
                    return (code, json.dumps(body).encode(), {"Content-Type": "application/json"})

            target_url = (f"{itsm_connector_details.itsm_url}" f"/api/now/attachment/{sys_id}/file")

            response = self._request(
                method = "get",
                url = target_url,
                itsm_details = itsm_connector_details,
                headers = {},
                verify = False
            )

            passthrough_headers = {}

            for header in ("Content-Type", "Content-Disposition"):

                if response.headers.get(header):
                    passthrough_headers[header] = response.headers[header]

            return (response.status_code, response.content, passthrough_headers)

        except Exception as e:

            log_event(
                application_logger,
                logging.ERROR,
                str(e),
                module_name = module_name,
                component_type = "itsm_connector_operations",
                component_name = "servicenow_execute_attachment_download"
            )

            return (500, json.dumps({"error": str(e)}).encode(), {"Content-Type": "application/json"})

        finally:
            db_local_session.close()

    def execute_attachment_upload(self, table_name, table_sys_id, file_name, content_type, file_bytes, module_name = "itsm", caller = None):
        """
        Proxy to ServiceNow's Attachment API upload endpoint
        (``/api/now/attachment/file``).

        ServiceNow expects the raw file bytes as the request body with the
        file's own Content-Type - not multipart/form-data - so the body is
        forwarded byte-for-byte. Returns ``(status_code, body)``.
        """

        db_local_session = db_session.get_db()

        try:

            (itsm_connector_details, error) = self._resolve_connector(db_local_session)

            if error:
                return error

            if caller and SCOPE_ENFORCEMENT:
                try:
                    # Uploading to a ticket you cannot see is a write into
                    # someone else's record - same ownership test as a read.
                    (user_sys_id, group_ids) = self._caller_identity(itsm_connector_details, caller)

                    if not self._parent_visible(itsm_connector_details, table_name, table_sys_id, user_sys_id, group_ids):
                        raise ScopeDenied(
                            "You do not have access to the record you are attaching to.",
                            f"{table_name} {table_sys_id} is not visible to you."
                        )

                except ScopeDenied as denial:
                    log_event(
                        application_logger,
                        logging.WARNING,
                        f"Scope denied for {caller} uploading to {table_name}/{table_sys_id} - {denial.message}",
                        module_name = module_name,
                        component_type = "itsm_connector_operations",
                        component_name = "servicenow_scope_enforcement"
                    )
                    return denial.as_response()

            target_url = (
                f"{itsm_connector_details.itsm_url}"
                f"/api/now/attachment/file"
                f"?table_name={table_name}"
                f"&table_sys_id={table_sys_id}"
                f"&file_name={requests.utils.quote(file_name)}"
            )

            response = self._request(
                method = "post",
                url = target_url,
                itsm_details = itsm_connector_details,
                data = file_bytes,
                headers = {"Content-Type": content_type or "application/octet-stream"},
                verify = False
            )

            return (response.status_code, self._body(response))

        except Exception as e:

            log_event(
                application_logger,
                logging.ERROR,
                str(e),
                module_name = module_name,
                component_type = "itsm_connector_operations",
                component_name = "servicenow_execute_attachment_upload"
            )

            return (500, {"error": str(e)})

        finally:
            db_local_session.close()

    # sys_id / query_string are optional on every verb so that callers can address a
    # single record (/table/<t>/<sys_id>) and pass sysparm_* options (notably
    # sysparm_display_value, which changes the response shape) on any request.
    # All added arguments default to the previous behaviour.

    # `caller` defaults to None on every helper, so existing internal callers
    # (MCP tools, kb_sync, incident_assist_utils) keep their unrestricted
    # behaviour. Only the browser-reachable HTTP routes pass a caller.

    def get_query(self, table_name, query_string = "", sys_id = None, caller = None):
        return self.execute(method = "get", table_name = table_name, query_string = query_string, sys_id = sys_id, caller = caller)

    def post_query(self, table_name, payload, query_string = "", caller = None):
        return self.execute(method = "post", table_name = table_name, payload = payload, query_string = query_string, caller = caller)

    def patch_query(self, table_name, sys_id, payload, query_string = "", caller = None):
        return self.execute(method = "patch", table_name = table_name, sys_id = sys_id, payload = payload, query_string = query_string, caller = caller)

    def put_query(self, table_name, sys_id, payload, query_string = "", caller = None):
        return self.execute(method = "put", table_name = table_name, sys_id = sys_id, payload = payload, query_string = query_string, caller = caller)

    def stats_query(self, table_name, query_string = "", caller = None):
        return self.execute_stats(table_name = table_name, query_string = query_string, caller = caller)

    def attachment_download_query(self, sys_id, caller = None):
        return self.execute_attachment_download(sys_id = sys_id, caller = caller)

    def attachment_upload_query(self, table_name, table_sys_id, file_name, content_type, file_bytes, caller = None):
        return self.execute_attachment_upload(
            table_name = table_name,
            table_sys_id = table_sys_id,
            file_name = file_name,
            content_type = content_type,
            file_bytes = file_bytes,
            caller = caller
        )

    # def delete_query(self, table_name, sys_id):
    #     return self.execute(method = "delete", table_name = table_name, sys_id = sys_id)
