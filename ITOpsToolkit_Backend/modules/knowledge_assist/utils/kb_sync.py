# Author - Vishwas K S
# Created On - June 09, 2026

# Default packages

import os
import re
import sys
import json
import base64
import hashlib
import logging
import datetime
from pathlib import Path
import html as html_lib 

# Third party packages
from bs4 import BeautifulSoup
from litellm import completion
from docling.datamodel.base_models import InputFormat
from docling.document_converter import DocumentConverter

import requests

# Global variables
SCRIPT_PATH = os.path.dirname(__file__)
ROOT_PATH = SCRIPT_PATH.split("modules")[0]
DB_PATH = os.path.join(ROOT_PATH, "database")
MCP_PATH = os.path.join(ROOT_PATH, "mcp_servers")
EMBEDDING_MODEL_PATH = os.path.join(ROOT_PATH, "embedding_model", "model")

sys.path.append(SCRIPT_PATH)
sys.path.append(ROOT_PATH)
sys.path.append(DB_PATH)
sys.path.append(MCP_PATH)

# Custom packages
import core_crud
import db_session
import db_models

from llm import LLM
import system_config_ka as scf
from servicenow_mcp import ServiceNow
from embedding_model.embedding_service import Embedder

from pro_logger import log_event, application_logger

MODULE_NAME = "knowledge_assist"

class ServiceNowKnowledgeSync:

    def __init__(self):

        self.converter = DocumentConverter()
        self.configs = scf.get_system_config()
        self.llm_obj = LLM()
        prompts = self.configs.get("prompts", {})
        image_prompt_config = prompts.get("knowledge_image_analyzer_agent", {})
        self.image_analysis_prompt = image_prompt_config.get("instruction", "")
        self.llm_tag =image_prompt_config.get("llm_tag",self.configs["llm_tag"])
        
        self.llm_obj.set_litellm_environment(self.llm_tag)
        self.llm_client = self.llm_obj.client
        self.itsm_tags = self.configs.get("itsm_tags",[])
        self.headers = {"content-type": "application/json"}
        self.itsm_obj = ServiceNow()
        db_local_session = db_session.get_db()
        self.itsm_details = core_crud.get_itsm_connector_details_with_creds(db_local_session,self.itsm_tags[0])
        db_local_session.close()
        
        if not self.itsm_details:
            log_event(application_logger,
                      logging.ERROR,
                      f"ITSM connector details not found for tag: {self.itsm_tags[0]}",
                      module_name = MODULE_NAME,
                      component_type = "kb_sync",
                      component_name = "kb_sync - run_kb_sync ",
                      )

            return
        self.snow_url = self.itsm_details.itsm_url.rstrip("/")

    def display_val(self, field, key = "display_value"):
        """Extract string from a sysparm_display_value=all dict, or return as-is."""
        if isinstance(field, dict):
            return field.get(key, "") or field.get("value", "")
        return field or ""

    def html_to_text(self, html):
        html = html_lib.unescape(html)
        try:
            soup = BeautifulSoup(html, "lxml")
        except Exception:
            soup = BeautifulSoup(html, "html.parser")
        for tag in soup(["style", "script", "head", "title", "meta", "link"]):
            tag.decompose()

        return soup.get_text(separator = "\n", strip = True)

    def extract_images_in_order(self, html_text):
        """
        Return every <img> tag's src/alt, IN DOCUMENT ORDER — this order is
        what lets us line them up with Docling's placeholders later.
        """
        images = []

        for m in re.finditer(r'<img\b([^>]*)>', html_text, re.IGNORECASE):
            attrs = m.group(1)
            src_match = re.search(r'src=["\']([^"\']+)["\']', attrs, re.IGNORECASE)
            alt_match = re.search(r'alt=["\']([^"\']*)["\']', attrs, re.IGNORECASE)
            if src_match:
                images.append({
                    "src": src_match.group(1),
                    "alt": (alt_match.group(1) if alt_match else "").replace("[", "").replace("]", ""),
                })
        return images

    def get_image_analysis(self, image_src):
        try:
            client = self.llm_client
        except Exception:
            return ""

        if "sys_attachment.do" not in image_src:
            raw_data = requests.get(image_src)
            content_type = raw_data.headers.get("Content-Type")

        else:
            sys_id = re.split(r"[;?]", image_src)[-1].strip().replace("sys_id=", "").replace("sys_id&#61;", "")
            target_url = f"{self.snow_url}/api/now/attachment/{sys_id}/file"

            try:
                raw_data = self.itsm_obj._request("get",target_url,self.itsm_details,headers=self.headers,verify=False,)
                content_type = json.loads(raw_data.headers["x-attachment-metadata"].encode("utf-8"))["content_type"]
            except Exception:
                return ""
        encoded = base64.b64encode(raw_data.content).decode("utf-8")
        
        # Send request to GPT-4o
        try:
            messages = [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text","text": self.image_analysis_prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{content_type};base64,{encoded}",
                                "detail": "high" # Options: low, high, auto
                            }
                        }
                    ]
                }
            ]

            response = completion(
                model=self.llm_obj.model,
                messages=messages,
            )
            return response.choices[0].message.content

        except Exception as e:
            log_event(application_logger, 
                      logging.ERROR,
                      f"Error analyzing image - {str(e)}",
                      is_exception = True,
                      module_name = MODULE_NAME,
                      component_type = "kb_sync",
                      component_name = "kb_sync - get_image_analysis",
                      )
            return ""

    def embed_image_links(self, markdown_text: str, images: list):
        """
        Replace each '<!-- image -->' placeholder in Docling's markdown output,
        IN ORDER, with the real ![alt](src) link at that same position.

        If the number of placeholders doesn't match the number of extracted
        <img> tags, this stops trying to guess and just warns you — better to
        know something's off than to silently mismatch images to positions.
        """
        placeholder = "<!-- image -->"
        parts = markdown_text.split(placeholder)
        n_placeholders = len(parts) - 1

        if n_placeholders != len(images):
            # print(f"[warning] {n_placeholders} placeholder(s) vs {len(images)} <img> tag(s)"
                # f"found — positions may not line up 1:1. Embedding as many as line up.")
            
            log_event(application_logger, 
                      logging.WARNING,
                      f"{n_placeholders} placeholder(s) vs {len(images)} <img> tag(s) found — positions may not line up 1:1. Embedding as many as line up.",
                      is_exception = True,
                      module_name = MODULE_NAME,
                      component_type = "kb_sync",
                      component_name = "kb_sync - embed_image_links",
                  )

        rebuilt = [parts[0]]
        for i in range(n_placeholders):
            if i < len(images):
                output = self.get_image_analysis(images[i]["src"])
                output = output.replace("\n", "").replace("[", "").replace("]", "").replace("(", "").replace(")", "").replace("!", "").strip()
                rebuilt.append(f"![{output}]({images[i]['src']})")
            else:
                rebuilt.append(placeholder)# no matching image left; leave placeholder as-is
            rebuilt.append(parts[i + 1])

        return "".join(rebuilt)

    def get_kb_roles_mapping(self,kb_base_ids):
        """Fetch read roles for given KB base sys_ids from kb_uc_can_read_mtom."""
        if not kb_base_ids:
            return {}

        base_url = self.itsm_details.itsm_url.rstrip("/")
        query = ",".join(kb_base_ids)
        target_url = (
            f"{base_url}/api/now/table/kb_uc_can_read_mtom"
            f"?sysparm_query=kb_knowledge_baseIN{query}"
            f"&sysparm_fields=user_criteria.role,kb_knowledge_base.sys_id"
            f"&sysparm_display_value=true"
            f"&sysparm_exclude_reference_link=true"
        )

        kb_roles = {kb_id: [] for kb_id in kb_base_ids}

        try:
            response = self.itsm_obj._request(
                "get", target_url, self.itsm_details,
                headers = {"content-type": "application/json"}, verify = False,
            )

            for role in response.json().get("result", []):
                kb_sys_id = role.get("kb_knowledge_base.sys_id")
                if kb_sys_id in kb_roles:
                    kb_roles[kb_sys_id].append(role.get("user_criteria.role", ""))

        except Exception as e:
            log_event(
                application_logger, logging.ERROR,
                f"Error fetching KB roles - {str(e)}",
                is_exception = True,
                module_name = MODULE_NAME,
                component_type = "kb_sync",
                component_name = "kb_sync - get_kb_roles_mapping",
            )

        return kb_roles

    def run_kb_sync(self, sync_mode = "incremental", days = 1):
        """
        Sync ServiceNow KB articles into the local vector database.

        Args:
            sync_mode: "initial" for full sync, "incremental"/"scheduled" for delta sync.
            days: Look-back window (in days) for delta sync. Articles created after
                  (now - days) are fetched. Ignored for "initial" sync.
        """       
        itsm_tags = self.itsm_tags

        if not itsm_tags:
            log_event(
                application_logger, logging.ERROR,
                "No ITSM tags configured for knowledge_assist. Cannot proceed.",
                module_name = MODULE_NAME,
                component_type = "kb_sync",
                component_name = "kb_sync - run_kb_sync",
            )
            return

        itsm_tags_str = ",".join(itsm_tags)
        itsm_obj = ServiceNow()

        # Resolve ITSM connector details and service account user
        db_local_session = db_session.get_db()
        itsm_details = core_crud.get_itsm_connector_details_with_creds(db_local_session, itsm_tags[0])
        db_local_session.close()

        if not itsm_details:
            log_event(
                application_logger, logging.ERROR,
                f"ITSM connector details not found for tag: {itsm_tags[0]}",
                module_name = MODULE_NAME,
                component_type = "kb_sync",
                component_name = "kb_sync - run_kb_sync",
            )
            return

        sync_user = itsm_details.itsm_user
        base_url = itsm_details.itsm_url.rstrip("/")

        # For delta sync ("incremental"/"scheduled"), only fetch articles created
        # after (now - days). Not applicable for a full "initial" sync.
        date_filter = None
        if sync_mode != "initial":
            date_filter = (
                datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days = days)
            ).strftime("%Y-%m-%d %H:%M:%S")

        # Fetch published articles from ServiceNow using existing ServiceNow method
        (status, articles) = itsm_obj.list_knowledge_articles(
            itsm_tags = itsm_tags_str, user = sync_user, module_name = MODULE_NAME,
            date_filter = date_filter,
        )
        
        if not status or not articles:
            log_event(
                application_logger, logging.WARNING,
                f"No knowledge articles fetched from ServiceNow (status={status}).",
                module_name = MODULE_NAME,
                component_type = "kb_sync",
                component_name = "kb_sync - run_kb_sync",
            )
            return

        # Build KB base roles mapping from kb_uc_can_read_mtom
        kb_base_ids = set()
        for article in articles:
            kb_id = self.display_val(article.get("kb_knowledge_base", ""), key = "value")
            if kb_id:
                kb_base_ids.add(kb_id)

        kb_roles_map = self.get_kb_roles_mapping(kb_base_ids)

        # Initialise embedder
        em_obj = Embedder(EMBEDDING_MODEL_PATH)
        em_obj.download_if_not_present()

        db_local_session = db_session.get_db()

        # Current ServiceNow KB numbers (from delta-filtered articles)
        current_kb_numbers = [self.display_val(a.get("number", "")) for a in articles]
        current_kb_numbers = [n for n in current_kb_numbers if n]

        # Stale deletion — fetch ALL KB numbers from ServiceNow (no date_filter)
        # and remove any local records no longer present there.
        if sync_mode != "initial":
            (all_status, all_articles) = itsm_obj.list_knowledge_articles(
                itsm_tags = itsm_tags_str, user = sync_user, module_name = MODULE_NAME,
                date_filter = None,
            )
            all_kb_numbers = []
            if all_status and all_articles:
                all_kb_numbers = [self.display_val(a.get("number", "")) for a in all_articles]
                all_kb_numbers = [n for n in all_kb_numbers if n]

            if all_kb_numbers:
                try:
                    db_local_session.query(db_models.KnowledgeArticleInventory).filter(
                        ~db_models.KnowledgeArticleInventory.kb_metadata["number"].astext.in_(all_kb_numbers)
                    ).delete(synchronize_session = "fetch")
                    db_local_session.commit()
                except Exception as e:
                    db_local_session.rollback()
                    log_event(
                        application_logger, logging.ERROR,
                        f"Error deleting stale KB articles - {str(e)}",
                        is_exception = True,
                        module_name = MODULE_NAME,
                        component_type = "kb_sync",
                        component_name = "kb_sync - run_kb_sync",
                    )

        for article in articles:
            html_text = self.display_val(article.get("text", ""))
            if not html_text:
                continue

            result = self.converter.convert_string(html_text, format = InputFormat.HTML)
            markdown_output = result.document.export_to_markdown()
            
            ordered_images = self.extract_images_in_order(html_text)
            markdown_with_images = self.embed_image_links(markdown_output, ordered_images)
            markdown_with_images = markdown_with_images.replace("/sys_attachment.do", base_url + "/sys_attachment.do")

            short_desc = self.display_val(article.get("short_description", ""))
            article_number = self.display_val(article.get("number", ""))
            article_sys_id = self.display_val(article.get("sys_id", ""), key = "value")
            kb_base_display = self.display_val(article.get("kb_knowledge_base", ""))
            kb_base_sys_id = self.display_val(article.get("kb_knowledge_base", ""), key = "value")

            content = f"# {short_desc}\n\nKnowledge article number - {article_number}\n\nKnowledge base - {kb_base_display}\n\n{markdown_with_images}"
            
            
            #break
            metadata = {
                "number": article_number,
                "kb_knowledge_base": kb_base_display,
                "kb_category": self.display_val(article.get("kb_category", "")),
                "author": self.display_val(article.get("author", "")),
                # "rating": self.display_val(article.get("rating", "")),
                "rating": "",
                "title": short_desc,
                "kb_link": f"{base_url}/now/nav/ui/classic/params/target/kb_view.do%3Fsys_kb_id%3D{article_sys_id}",
                "roles": kb_roles_map.get(kb_base_sys_id, []),
            }

            # Generate the embedding BEFORE touching the DB, so a failure here does
            # not leave us having deleted the old record without a replacement.
            (emb_status, embedding) = em_obj.embed(content)
            if not emb_status:
                log_event(
                    application_logger, logging.ERROR,
                    f"Embedding generation failed for {article_number} - {embedding}",
                    module_name = MODULE_NAME,
                    component_type = "kb_sync",
                    component_name = "kb_sync - run_kb_sync",
                )
                continue

            # Idempotent upsert: unconditionally delete any existing copy of this KB
            # (a no-op when absent) and insert the fresh version in a single
            # transaction so re-syncs never accumulate duplicates.
            try:
                if article_number:
                    db_local_session.query(db_models.KnowledgeArticleInventory).filter(
                        db_models.KnowledgeArticleInventory.kb_metadata["number"].astext == article_number
                    ).delete(synchronize_session = "fetch")

                record = db_models.KnowledgeArticleInventory(
                    content = content,
                    embedding = embedding,
                    kb_metadata = metadata,
                )
                db_local_session.add(record)
                db_local_session.commit()
            except Exception as e:
                db_local_session.rollback()
                log_event(
                    application_logger, logging.ERROR,
                    f"Error upserting KB {article_number} into DB - {str(e)}",
                    is_exception = True,
                    module_name = MODULE_NAME,
                    component_type = "kb_sync",
                    component_name = "kb_sync - run_kb_sync",
                )

        db_local_session.close()

        log_event(
            application_logger, logging.INFO,
            f"KB sync completed - mode: {sync_mode}",
            module_name = MODULE_NAME,
            component_type = "kb_sync",
            component_name = "kb_sync - run_kb_sync",
        )



if __name__ == "__main__":

    sync_mode = (sys.argv[1] if len(sys.argv) > 1 else "incremental")
    days = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    if sync_mode == "initial":
        db_models.create_tables()
    kb_sync_obj = ServiceNowKnowledgeSync()

    kb_sync_obj.run_kb_sync(sync_mode = sync_mode,days = days)






 
