# Author - Hemanth Tubachi
# Created On - June 09, 2026

import os
import sys
import logging
from typing import Any, Dict, List

import litellm
from langchain_core.retrievers import BaseRetriever
from langchain_core.callbacks import CallbackManagerForRetrieverRun
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import BaseMessage, AIMessage
from langchain_core.outputs import ChatResult, ChatGeneration
from pydantic import ConfigDict

from langchain_classic.retrievers import ContextualCompressionRetriever
from langchain_classic.retrievers.document_compressors import LLMChainExtractor

from langchain_classic.prompts import (
        ChatPromptTemplate,
        PromptTemplate,
        SystemMessagePromptTemplate,
        HumanMessagePromptTemplate,
        AIMessagePromptTemplate
        )

from langchain_classic.schema import Document


class LiteLLMChatModel(BaseChatModel):
    """Minimal langchain-compatible wrapper around litellm.completion."""

    model: str

    def _generate(self, messages: list, stop=None, run_manager=None, **kwargs) -> ChatResult:
        formatted = [{"role": ("user" if m.type == "human" else m.type), "content": m.content} for m in messages]
        response = litellm.completion(model=self.model, messages=formatted)
        content = response.choices[0].message.content or ""
        return ChatResult(generations=[ChatGeneration(message=AIMessage(content=content))])

    @property
    def _llm_type(self) -> str:
        return "litellm"

    def invoke(self, input, **kwargs):
        if isinstance(input, str):
            from langchain_core.messages import HumanMessage
            messages = [HumanMessage(content=input)]
        else:
            messages = input
        result = self._generate(messages)
        return result.generations[0].message

#from pro_logger import log_event, application_logger

# Global variables
SCRIPT_PATH = os.path.dirname(__file__)
ROOT_PATH = SCRIPT_PATH.split("modules")[0]
DB_PATH = os.path.join(ROOT_PATH, "database")
UTILS_PATH = os.path.dirname(SCRIPT_PATH)
EMBEDDING_MODEL_PATH = os.path.join(ROOT_PATH, "embedding_model", "model")

sys.path.append(ROOT_PATH)
sys.path.append(DB_PATH)
sys.path.append(UTILS_PATH)

import core_crud
import db_session
import db_models
import system_config_pa as scf
from embedding_model.embedding_service import Embedder
from pro_logger import log_event, application_logger

class PGKBRetriever(BaseRetriever):
    """Retriever that queries knowledge_article_inventory via pgvector cosine similarity."""

    model_config = ConfigDict(arbitrary_types_allowed = True)

    em_obj: Any
    k: int = 4

    def _get_relevant_documents(
        self, query: str, *, run_manager: CallbackManagerForRetrieverRun
    ) -> List[Document]:
        docs_and_scores = self.similarity_search_with_relevance_scores(query, k = self.k)
        return [doc for doc, _ in docs_and_scores]

    def similarity_search_with_relevance_scores(self, query: str, k: int = 4, **kwargs) -> List[tuple]:
        """Return (Document, similarity_score) pairs ordered by cosine similarity."""
        (status, query_embedding) = self.em_obj.embed(query)
        if not status:
            return []

        db_local_session = db_session.get_db()
        try:
            results = db_local_session.query(
                db_models.KnownErrorArticleInventory,
                db_models.KnownErrorArticleInventory.embedding.cosine_distance(query_embedding).label("distance")
            ).order_by("distance").limit(k).all()

            docs_and_scores = []
            for row, distance in results:
                score = 1.0 - float(distance)
                metadata = dict(row.kb_metadata or {})
                metadata["source"] = metadata.get("number", str(row.id))
                doc = Document(page_content = row.content or "", metadata = metadata)
                docs_and_scores.append((doc, score))

            return docs_and_scores
        finally:
            db_local_session.close()

    def as_retriever(self, **kwargs):
        return self


class CustomContextualCompressionRetriever(ContextualCompressionRetriever):
    def _get_relevant_documents(
            self, query: str, *, run_manager: CallbackManagerForRetrieverRun, **kwargs: Any
    ) -> List[Document]:
        '''Get docs, adding score information.'''
        docs_and_similarities = self.base_retriever.similarity_search_with_relevance_scores(query, **kwargs)
        docs = [doc for doc, _ in docs_and_similarities]
        for doc, similarity in docs_and_similarities:
            doc.metadata['similarity_score'] = similarity

        return docs

class KnowledgeAssistant:
    def __init__(self):
        # Read system config
        configs = scf.get_system_config()
        llm_tag = configs.get("llm_tag")


        # Load LLM details from DB and set env vars
        db_local_session = db_session.get_db()
        llm_details = core_crud.get_llm_details_with_creds(db_local_session, llm_tag)
        db_local_session.close()

        llm_type = llm_details.llm_type.value
        llm_config = llm_details.llm_config

        for env_var, val in llm_config.items():
            os.environ[env_var] = val

        if llm_type == "Azure OpenAI":
            model_name = llm_config.get("AZURE_DEPLOYMENT_NAME")
            if not model_name.startswith("azure/"):
                model_name = "azure/" + model_name

        elif llm_type == "Google Gemini":
            model_name = llm_config.get("MODEL")
            if not model_name.startswith("gemini/"):
                model_name = "gemini/" + model_name

        elif llm_type == "AWS Nova":
            model_name = llm_config.get("LITELLM_MODEL")
            if not model_name.startswith("bedrock/"):
                model_name = "bedrock/" + model_name

        self.llm = LiteLLMChatModel(model = model_name)
        self.compressor = LLMChainExtractor.from_llm(self.llm)

        # Embedder + KB retriever
        em_obj = Embedder(EMBEDDING_MODEL_PATH)
        em_obj.download_if_not_present()
        self.kb_connection = PGKBRetriever(em_obj = em_obj)

        # KB similarity threshold score
        self.kb_similarity_threshold_score = 0.5

    def get_compressed_response(self, quest):
        '''
        compression_retriever = ContextualCompressionRetriever(base_compressor = self.compressor, \
                base_retriever = self.kb_connection.as_retriever(search_type = 'similarity_score_threshold', search_kwargs = {'score_threshold': 0.1}))
        '''

        compression_retriever = CustomContextualCompressionRetriever(base_compressor = self.compressor, \
                base_retriever = self.kb_connection.as_retriever())

        compression_retriever.base_retriever = self.kb_connection

        # Below invoke method is linked to get_relevant_documents
        compressed_docs = compression_retriever.invoke(quest)
        
        response = 'Reference KEDB Articles - \n'

        page_contents = {}
        for doc in compressed_docs:
            if doc.metadata['similarity_score'] >= self.kb_similarity_threshold_score:
                response += doc.metadata['source'] + ' - Similarity - ' + str(round(doc.metadata['similarity_score'] * 100, 2)) + '% - Article\'s Link - ' + doc.metadata['kb_link'] + '\n'
                page_contents[doc.metadata['source']] = doc.page_content

        articles = ''
        if page_contents == {}:
            response += 'No relevant KEDB articles found in repository'

            return response


        else: 
            response += '\n\n'

            #system_message = 'Assume that you are technical SME who likes to read multiple documents and summarize the knowledge in generic language without using any sensitive data.'
            system_message = 'Assume that you are technical SME who likes to read multiple documents and identify any obstacle to implement the suggested preventive actions.'
            system_message_prompt = SystemMessagePromptTemplate.from_template(system_message)

            human_message = 'Consider a following content delimited by 3 back ticks - \n\n```\n{articles}\n```\n\n'
            #human_message += 'The content is a collection of articles. Go through all articles and form a sequence of steps to resolve the issue. Make sure to include a reference of knowledge article number in brackets.\n\n'
            human_message += 'The content is a collection of articles. Go through all articles and form a list of obstacle to implement the suggested preventive actions. Make sure to include a reference of knowledge article number in brackets.\n\n'
            human_message += 'The response should be in context to the following question delimited by 3 back ticks - ```' + quest + '```'

            count = 1
            for kb_number, kb_content in page_contents.items():
                articles += str(count) + '. Article number - ' + kb_number + '\n' + 'Article summary - ' + kb_content
                articles += '\n---------------------------------------------------------------------------------------------\n'

                count += 1

            articles = articles.strip()

            human_message_prompt = HumanMessagePromptTemplate.from_template(human_message)
            human_message_prompt.prompt.input_variables = []

        chat_prompt = ChatPromptTemplate.from_messages([system_message_prompt, human_message_prompt])
        summary = ''
        try:
            if articles != '':
                '''
                # VertexAI - Google Gemini
                summary = self.llm.invoke(str(chat_prompt.format_prompt(articles = articles).to_messages()))
                '''

                # Azure Chat OpenAI
                summary = self.llm.invoke(str(chat_prompt.format_prompt(articles = articles).to_messages())).content
            else:
                '''
                # Vertex AI - Google Gemini
                summary = self.llm.invoke(str(chat_prompt.format_prompt().to_messages()))
                '''

                # Azure Chat OpenAI
                summary = self.llm.invoke(str(chat_prompt.format_prompt().to_messages())).content

        except Exception as e:
            # Application logging
            log_event(application_logger,
                      logging.ERROR,
                      f"Prompt library parsing error - {str(e)}",
                      is_exception = True,
                      module_name = "problem_assist",
                      component_type = "get_compressed_response",
                      component_name = "reactive_problem")

        final_response = ''
        for line in response.split('\n'):
            if 'Similarity' in line and "Article's Link" in line:
                if line.split(' - Similarity - ')[0].strip() in summary:
                    final_response += line + '\n'
            else:
                final_response += line + '\n'

        final_response += summary
        return final_response

# if __name__ == "__main__":
#     ka = KnowledgeAssistant()
#     quest = "How to resolve the issue of server Bandwidth?"
#     response = ka.get_compressed_response(quest)
#     print(response)