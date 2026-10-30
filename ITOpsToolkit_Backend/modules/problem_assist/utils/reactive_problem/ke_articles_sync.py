# Author - Hemanth Tubachi
# Created On - June 09, 2026
import os
import sys
import logging
import html as html_lib

from bs4 import BeautifulSoup

SCRIPT_PATH = os.path.dirname(__file__)
ROOT_PATH = SCRIPT_PATH.split("modules")[0]
DB_PATH = os.path.join(ROOT_PATH, "database")
MCP_PATH = os.path.join(ROOT_PATH, "mcp_servers")
UTILS_PATH = os.path.dirname(SCRIPT_PATH)
EMBEDDING_MODEL_PATH = os.path.join(ROOT_PATH, "embedding_model", "model")

sys.path.append(SCRIPT_PATH)
sys.path.append(ROOT_PATH)
sys.path.append(DB_PATH)
sys.path.append(MCP_PATH)
sys.path.append(UTILS_PATH)

import core_crud
import db_session
import db_models
import system_config_pa as scf

from servicenow_mcp import ServiceNow
from embedding_model.embedding_service import Embedder
from pro_logger import log_event, application_logger


def html_to_text(html):
    html = html_lib.unescape(html)
    try:
        soup = BeautifulSoup(html, "lxml")
    except Exception:
        soup = BeautifulSoup(html, "html.parser")

    for tag in soup(["style", "script", "head", "title", "meta", "link"]):
        tag.decompose()

    return soup.get_text(separator="\n", strip=True)


class ServiceNowKBArticles:
    def __init__(self):
        configs = scf.get_system_config()
        itsm_tags = configs.get("itsm_tags", [])

        self.ke_category = configs.get("KE_CATEGORY_NAME", "Known Error")

        db_local_session = db_session.get_db()
        itsm_details = core_crud.get_itsm_connector_details_with_creds(db_local_session, itsm_tags[0])
        db_local_session.close()

        if itsm_details is None:
            log_event(application_logger, 
                      logging.ERROR,
                      f"Failed to retrieve ITSM connector details for tag '{itsm_tags[0]}'.",
                      is_exception=True,
                      module_name="problem_assist",
                      component_type="ServiceNowKBArticles",
                      component_name="ke_articles",
                  )

        self.itsm_details = itsm_details
        self.snow_url = itsm_details.itsm_url.rstrip("/")
        self.itsm_obj = ServiceNow()
        self.headers = {"content-type": "application/json"}

    def get_kb_articles_details(self):
        ke_url = (
            self.snow_url
            + "/api/now/table/kb_knowledge_base?sysparm_query=title="
            + self.ke_category
            + "&sysparm_fields=sys_id"
        )

        try:
            response = self.itsm_obj._request(
                "get", ke_url, self.itsm_details,
                headers=self.headers, verify=False,
            )
            sysid = response.json()["result"]
            ke_sysid = sysid[0]["sys_id"]

        except Exception as e:
            log_event(
                application_logger, logging.ERROR,
                f"Failed to fetch KB knowledge base sys_id: {str(e)}",
                is_exception=True,
                module_name="problem_assist",
                component_type="get_kb_articles_details",
                component_name="ke_articles",
            )
            return []

        target_url = (
            self.snow_url
            + "/api/now/table/kb_knowledge?sysparm_query=kb_knowledge_base="
            + ke_sysid
            + "&sysparm_fields=sys_id,number,category,short_description,text"
            + "&sysparm_display_value=true"
            + "&sysparm_exclude_reference_link=true"
            + "&workflow_state=published"
        )

        try:
            response = self.itsm_obj._request(
                "get", target_url, self.itsm_details,
                headers=self.headers, verify=False,
            )
            kb_articles = response.json()["result"]
        except Exception as e:
            log_event(application_logger, 
                     logging.ERROR,
                     f"Failed to fetch KB articles: {str(e)}",
                     is_exception=True,
                     module_name="problem_assist",
                     component_type="get_kb_articles_details",
                     component_name="ke_articles",)
            return []

        for ind in range(len(kb_articles)):
            raw_html = kb_articles[ind].get("text", "")
            if raw_html:
                kb_articles[ind]["text"] = html_to_text(raw_html)
            kb_articles[ind]["kb_link"] = (
                self.snow_url
                + "/now/nav/ui/classic/params/target/kb_view.do%3Fsys_kb_id%3D"
                + kb_articles[ind]["sys_id"]
            )

        return kb_articles

    def sync_to_db(self, kb_articles, sync_mode="incremental"):
        """Embed and upsert KB articles into KnownErrorArticleInventory."""
        if not kb_articles:
            log_event(application_logger,
                      logging.WARNING,
                      "No KB articles to sync.",
                      module_name="problem_assist",
                      component_type="sync_to_db",
                      component_name="ke_articles",
                      )
            return

        em_obj = Embedder(EMBEDDING_MODEL_PATH)
        em_obj.download_if_not_present()

        db_local_session = db_session.get_db()

        # Incremental sync — delete stale articles no longer present in ServiceNow
        current_numbers = [a.get("number", "") for a in kb_articles if a.get("number")]
        if sync_mode != "initial" and current_numbers:
            try:
                db_local_session.query(db_models.KnownErrorArticleInventory).filter(
                    ~db_models.KnownErrorArticleInventory.kb_metadata["number"].astext.in_(current_numbers)
                ).delete(synchronize_session="fetch")
                db_local_session.commit()
            except Exception as e:
                db_local_session.rollback()
                log_event(application_logger,
                          logging.ERROR,
                          f"Error deleting stale KE articles - {str(e)}",
                          is_exception=True,
                          module_name="problem_assist",
                          component_type="sync_to_db",
                          component_name="ke_articles",
                          )

        for article in kb_articles:
            if not article.get("text"):
                continue

            article_number = article.get("number", "")
            short_desc = article.get("short_description", "")
            content = f"Short Description - {short_desc}\n\nContent - \n{article['text']}"

            metadata = {
                "number": article_number,
                "category": article.get("category", ""),
                "title": short_desc,
                "kb_link": article.get("kb_link", ""),
            }

            # Generate embedding BEFORE deleting the old record so a failure here
            # does not leave us without a copy in the DB.
            (emb_status, embedding) = em_obj.embed(content)
            if not emb_status:
                log_event(application_logger,
                          logging.ERROR,
                          f"Embedding generation failed for {article_number} - {embedding}",
                          module_name="problem_assist",
                          component_type="sync_to_db",
                          component_name="ke_articles",
                          )
                continue

            # Idempotent upsert: delete any existing copy then insert fresh version
            try:
                if article_number:
                    db_local_session.query(db_models.KnownErrorArticleInventory).filter(
                        db_models.KnownErrorArticleInventory.kb_metadata["number"].astext == article_number
                    ).delete(synchronize_session="fetch")

                record = db_models.KnownErrorArticleInventory(
                    content=content,
                    embedding=embedding,
                    kb_metadata=metadata,
                )
                db_local_session.add(record)
                db_local_session.commit()
            except Exception as e:
                db_local_session.rollback()
                log_event(application_logger,
                          logging.ERROR,
                          f"Error upserting KE article {article_number} into DB - {str(e)}",
                          is_exception=True,
                          module_name="problem_assist",
                          component_type="sync_to_db",
                          component_name="ke_articles",)

        db_local_session.close()

        log_event(application_logger, 
                  logging.INFO,
                  f"KE article sync to DB completed - mode: {sync_mode}",
                  is_exception=False,
                  module_name="problem_assist",
                  component_type="sync_to_db",
                  component_name="ke_articles",)


if __name__ == "__main__":
    sync_mode = sys.argv[1] if len(sys.argv) > 1 else "incremental"
    if sync_mode == "initial":
        db_models.create_tables()

    sn_kb_art_obj = ServiceNowKBArticles()
    kb_articles = sn_kb_art_obj.get_kb_articles_details()
    sn_kb_art_obj.sync_to_db(kb_articles, sync_mode=sync_mode)
    print(f"KE sync completed - mode: {sync_mode}")
