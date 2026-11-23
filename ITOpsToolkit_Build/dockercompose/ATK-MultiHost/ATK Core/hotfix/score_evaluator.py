import os
import sys
import time
import logging
import asyncio

SCRIPT_PATH = os.path.dirname(os.path.abspath(__file__))
ROOT_PATH = os.path.join(SCRIPT_PATH.split('modules')[0])

sys.path.append(ROOT_PATH)
sys.path.append(SCRIPT_PATH)

import core_crud
from database import db_session
from pro_logger import application_logger, log_event
from knowledge_assist_utils import KnowledgeAssistUtils

async def evaluate_articles():
    BATCH_SIZE = 10
    skipped_kb_numbers = {
        number.strip()
        for number in os.getenv("SCORE_EVALUATOR_SKIP_KB_NUMBERS", "").split(",")
        if number.strip()
    }

    db_local_Session = db_session.get_db()
    (status, data) = core_crud.list_knowledge_articles_by_score(
        db_local_Session,
        "",
        "eq",
        BATCH_SIZE,
        "knowledge_assist",
        excluded_numbers=sorted(skipped_kb_numbers),
    )
    db_local_Session.close()

    if skipped_kb_numbers:
        log_event(
            application_logger,
            logging.INFO,
            f"Skipping knowledge articles: {', '.join(sorted(skipped_kb_numbers))}",
            module_name="knowledge_assist",
            component_type="scheduled job",
            component_name="score_evaluator - evaluate_articles"
        )
    
    if not status:
        return (status, data)

    if len(data) == 0:
         log_event(
            application_logger,
            logging.INFO,
            "No knowledge articles without a rating were found.",
            module_name="knowledge_assist",
            component_type="scheduled job",
            component_name="score_evaluator - evaluate_articles"
        )

    ka_obj = KnowledgeAssistUtils()
    db_local_Session = db_session.get_db()
    try:
        for row in data:
            (status, score_details) = await ka_obj.score_knowledge_article(row.content)

            if not status:
                return (status, score_details)

            (status, response) = core_crud.update_kb_scores(db_local_Session, row.number, score_details.get("average_score"))

            if not status:
                return (status, response)

            score_details["kb_number"] = row.number

            (status, existing_scores) = core_crud.list_article_scores(db_local_Session, row.number)
            if not status:
                return (status, existing_scores)

            if existing_scores:
                (status, response) = core_crud.update_article_scores(db_local_Session, score_details)
            else:
                (status, response) = core_crud.insert_kb_scores(db_local_Session, score_details)

            if not status:
                return (status, response)

            log_event(
                application_logger,
                logging.INFO,
                f"Evaluation is completed for article number: {row.number}",
                module_name="knowledge_assist",
                component_type="scheduled job",
                component_name="score_evaluator - evaluate_articles"
            )
            print(f"Evaluation completed for article: {row.number}")
            time.sleep(20)

        return (True, f"{len(data)} articles evaluated successfully!")
    except Exception as e:
        return (False, f"Article evaluation failed - {str(e)}")

    finally:
        db_local_Session.close()

if __name__ == "__main__":

    (status, response) = asyncio.run(evaluate_articles())

    if not status:
        log_event(
            application_logger,
            logging.ERROR,
            response,
            is_exception = True,
            module_name = "knowledge_assist",
            component_type = "scheduled job",
            component_name = "score_evaluator - evaluate_articles"
        )

    log_event(
        application_logger,
        logging.INFO,
        response,
        module_name="knowledge_assist",
        component_type="scheduled job",
        component_name="score_evaluator - evaluate_articles"
    )