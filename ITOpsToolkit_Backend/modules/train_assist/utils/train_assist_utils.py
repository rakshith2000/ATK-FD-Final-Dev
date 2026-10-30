# Author - Vishwas K S, Viraj Purandare, Ragavan Veerarajan
# Created On - May 6, 2026
# updated Om - Sep 10, 2026


# Default packages
import os
import sys
import json
import datetime
from collections import defaultdict

# Global variables
SCRIPT_PATH = os.path.dirname(__file__)
ROOT_PATH = SCRIPT_PATH.split("modules")[0]
DB_PATH = os.path.join(ROOT_PATH, "database")

TS_FORMAT = "%Y-%m-%d %H:%M:%S"

sys.path.append(SCRIPT_PATH)
sys.path.append(ROOT_PATH)

# Custom packages
import core_crud
import db_session

import train_assist_agent
import system_config_ta as scf
from extract_json import extract_and_validate_json
from modules.auth.utils.auth_handler import get_user_info_supplementary

# Train assist functionalities
class TrainAssistUtils:
    def __init__(self):
        db_local_session = db_session.get_db()

        # Tag passing threshold to quiz
        (status, pass_threshold) = core_crud.get_module_configurations(db_local_session, "train_assist", "PASS_THRESHOLD")

        if status and pass_threshold:
            self.pass_threshold = int(pass_threshold[0].value)
        else:
            self.pass_threshold = 70

        # db_local_session.close()

        # Tag NUMBER_OF_QUESTIONS_PER_QUIZ to quiz
        (status, number_of_questions) = core_crud.get_module_configurations(db_local_session, "train_assist", "NUMBER_OF_QUESTIONS_PER_QUIZ")

        if status and number_of_questions:
            self.number_of_questions_per_quiz = int(number_of_questions[0].value)
        else:
            self.number_of_questions_per_quiz = 5
        

        db_local_session.close()

    # Onboard a quiz
    async def generate_mcqs(self, article_numbers, token):
        db_local_session = db_session.get_db()

        try:
            user_id = get_user_info_supplementary(token)["user_id"]
        except Exception as e:
            return (False, f"MCQ generation failed - Token expired - {str(e)}")

        (status, data) = core_crud.list_knowledge_articles(db_local_session, article_numbers, module_name = "train assist")
        if not status:
            db_local_session.close()
            return (status, data)

        configs = scf.get_system_config()
        sys_prompts_config = configs["sys_prompts_config"]
        mcq_sys_prompt = sys_prompts_config.get("quiz_generation_agent", None)
        (description, instruction) = scf.apply_system_prompt_guardrail(mcq_sys_prompt)

     
        # Generate a quiz and insert to database
        quiz_data = []
        for kb_number in data:
            quiz = {}

            query = f"{instruction}\n\nGenerate a quiz of exactly 5 questions for below article - {data[kb_number]}"
            llm_response = await train_assist_agent.quiz_generation(query, token)
            llm_response = llm_response.replace("**", "")

            (status, quiz_contents) = extract_and_validate_json(llm_response)
            if not status:
                db_local_session.close()
                return (status, quiz_contents)

            quiz["kb_number"] = kb_number
            quiz["quiz"] = json.dumps(quiz_contents[0].get("questions"))

            quiz_data.append(quiz)

        quiz_details = {"quiz_list": quiz_data, "logged_in_user": user_id}
        (status, quiz_code) = core_crud.insert_quiz_details(db_local_session, quiz_details)

        if not status:
            db_local_session.close()
            return (status, quiz_code)

        # Set user response that consists of questions too
        # Initial response - all empty
        (status, data) = core_crud.get_quiz_details(db_local_session, quiz_code = quiz_code, user_id = user_id, columns = ["quiz", "id"])
        
        if not status:
            db_local_session.close()
            return (status, data)

        for row in data:
            quiz_data = []
            quiz = json.loads(row.quiz)
            for item in quiz:
                item["user_response"] = ""
                try:
                    del item["answer"]
                except:
                    pass
                quiz_data.append(item)

            initial_state = {"quiz_code": quiz_code, "quiz_id": row.id, "user_id": user_id, "logged_in_user": user_id}
            update_dict = {"user_response": json.dumps(quiz_data)}

            (status, output) = core_crud.update_quiz_details(db_local_session, initial_state, update_dict)
            
            if not status:
                db_local_session.close()
                return (status, output)

        db_local_session.close()
        return (status, (quiz_code, self.pass_threshold))
    # Onboard a quiz
    async def generate_mcqs_v1(self, 
                               article_numbers, 
                               token,  
                               difficulty_level="Beginner"):
        """
        Description : Generate a quiz from one or more knowledge base articles.

        The requested number of questions is distributed across the selected
        knowledge articles. Questions are generated using the appropriate
        difficulty-specific assessment agent (Beginner, Specialist, or Expert),
        validated, persisted to the database, and initialized with empty

        Args:
        - article_numbers (list[str]): List of knowledge article numbers to generate questions from.
        - token (str): Authentication token used to identify the logged-in user.
        - quiz_count (int, optional): Number of questions is retrieved from NUMBER_OF_QUESTIONS_PER_QUIZ configuration.
        - difficulty_level (str, optional): Difficulty level of the assessment. Supported values:
                                            ("Beginner", "Specialist", and "Expert")
                                            Defaults to "Beginner".
        
        Returns:
        tuple:
            On success:
                (True,(quiz_code (str), pass_threshold (int)))

            On failure:
                (False, error_message (str))

        """
        
        quiz_count = self.number_of_questions_per_quiz
        
        db_local_session = db_session.get_db()

        try:
            user_id = get_user_info_supplementary(token)["user_id"]
        except Exception as e:
            return (False, f"MCQ generation failed - Token expired - {str(e)}")

        (status, data) = core_crud.list_knowledge_articles(db_local_session, article_numbers, module_name = "train assist")
        if not status:
            db_local_session.close()
            return (status, data)

        configs = scf.get_system_config()
        sys_prompts_config = configs["sys_prompts_config"]
        # mcq_sys_prompt = sys_prompts_config.get("quiz_generation_agent", None)
        # (description, instruction) = scf.apply_system_prompt_guardrail(mcq_sys_prompt)

        if difficulty_level == "Beginner":
            prompt_key = "quiz_generation_beginner_agent"
        elif difficulty_level == "Specialist":
            prompt_key = "quiz_generation_specialist_agent"
        else:
            prompt_key = "quiz_generation_expert_agent"
        
        mcq_sys_prompt = sys_prompts_config.get(prompt_key)
        (description, instruction) = scf.apply_system_prompt_guardrail(mcq_sys_prompt)

     
        # Generate a quiz and insert to database
        quiz_data = []

        if quiz_count < len(data):
            db_local_session.close()
            return (
                False,
                f"Quiz count ({quiz_count}) cannot be less than the "
                f"number of selected articles ({len(data)})."
            )

        # Distribute the requested quiz questions across all selected KB articles.
        # Any remaining questions are assigned to the final KB article.
        total_kbs = len(data)
        base_question_count = quiz_count // total_kbs
        remainder = quiz_count % total_kbs

        for index, kb_number in enumerate(data):
            quiz = {}
            question_for_kb = base_question_count
            # Assign leftover questions to the final KB article.
            if index == total_kbs - 1:
                question_for_kb += remainder

            query = f"""
            {instruction}

            Generate exactly {question_for_kb} questions.

            Article Content:

            {data[kb_number]}
            """            

            # Orchestraion of Three Difficulty Level Agents
            if difficulty_level == "Beginner":
                llm_response = await train_assist_agent.quiz_generation_beginner(
                    query,
                    token
                )

            elif difficulty_level == "Specialist":
                llm_response = await train_assist_agent.quiz_generation_specialist(
                    query,
                    token
                )

            else:
                llm_response = await train_assist_agent.quiz_generation_expert(
                    query,
                    token
                )            
            # llm_response = await train_assist_agent.quiz_generation(query, token)
            llm_response = llm_response.replace("**", "")

            (status, quiz_contents) = extract_and_validate_json(llm_response)

            if not status:
                db_local_session.close()
                return (status, quiz_contents)

            generated_questions = quiz_contents[0].get("questions", [])
            if len(generated_questions) != question_for_kb:
                db_local_session.close()
                return (
                    False,
                    f"Expected {question_for_kb} questions but received len{(generated_questions)}"
                )
            quiz["kb_number"] = kb_number
            quiz["quiz"] = json.dumps(quiz_contents[0].get("questions"))

            quiz_data.append(quiz)

        quiz_details = {"quiz_list": quiz_data, "logged_in_user": user_id}
        (status, quiz_code) = core_crud.insert_quiz_details(db_local_session, quiz_details)

        if not status:
            db_local_session.close()
            return (status, quiz_code)

        # Set user response that consists of questions too
        # Initial response - all empty
        (status, data) = core_crud.get_quiz_details(db_local_session, quiz_code = quiz_code, 
                                                    user_id = user_id, columns = ["quiz", "id"])
        
        if not status:
            db_local_session.close()
            return (status, data)

        for row in data:
            quiz_data = []
            quiz = json.loads(row.quiz)
            for item in quiz:
                item["user_response"] = ""
                try:
                    del item["answer"]
                except:
                    pass
                quiz_data.append(item)

            initial_state = {"quiz_code": quiz_code, "quiz_id": row.id, "user_id": user_id, "logged_in_user": user_id}
            update_dict = {"user_response": json.dumps(quiz_data)}

            (status, output) = core_crud.update_quiz_details(db_local_session, initial_state, update_dict)
            
            if not status:
                db_local_session.close()
                return (status, output)

        db_local_session.close()
        return (status, (quiz_code, self.pass_threshold))

    # Generate subjective use case scenario
    async def generate_scenarios(self, articles_number, prompt, token, conv_history = []):
        db_local_session = db_session.get_db()

        (status, data) = core_crud.list_knowledge_articles(db_local_session, [articles_number], module_name = "train assist")
        if not status:
            db_local_session.close()
            return (status, data)

        db_local_session.close()

        configs = scf.get_system_config()
        sys_prompts_config = configs["sys_prompts_config"]
        scenario_sys_prompt = sys_prompts_config.get("scenario_generation_agent", None)
        (description, instruction) = scf.apply_system_prompt_guardrail(scenario_sys_prompt)

        llm_prompt = f"{instruction}\n\nGenerate a subjective non-repetative scenario from below content that truly evaluates the knowledge of examinee: {data}\n"
        llm_prompt += "\n\nBelow is the conversation history -\n\n"

        conv_history.append({"role": "user", "content": prompt})

        # Manage conversation history for chatbot
        for dialogue in conv_history:
            llm_prompt += f"{dialogue.get('role')}: {dialogue.get('content')}\n"


        llm_response = await train_assist_agent.scenario_generation(llm_prompt, token)
        # llm_response = llm_response.replace("**", "")
        conv_history.append({"role": "assistant", "content": llm_response})

        output = {"response": llm_response, "conv_history": conv_history}
        return (True, output)

    # Summarize quiz results
    async def update_quiz_summary(self, correct_responses, incorrect_responses, quiz_code, user_id, token):
        configs = scf.get_system_config()
        sys_prompts_config = configs["sys_prompts_config"]
        quiz_summary_sys_prompt = sys_prompts_config.get("quiz_summary_agent", None)
        (description, instruction) = scf.apply_system_prompt_guardrail(quiz_summary_sys_prompt)


        query = f"{instruction}\n\nPlease refer to the facts for quiz attempted by user and summarize the performance details - \n\n"

        if correct_responses != []:
            query += "Below questions are answered correctly - \n"
            query += "\n".join(correct_responses) + "\n\n"
        else:
            query += "None of the questions are answered correctly.\n\n"

        if incorrect_responses != []:
            query += "Below questions are answered incorrectly - \n"
            query += "\n".join(incorrect_responses) + "\n\n"
        else:
            query += "All questions are answered correctly.\n\n"

        llm_response = await train_assist_agent.quiz_summary(query, token)
        llm_response = llm_response.replace("**", "")
        
        db_local_session = db_session.get_db()

        # Check if quiz summary exists
        (status, existing_quiz_summary) = core_crud.get_quiz_summary_details(db_local_session, quiz_code, user_id, columns = ["quiz_code"])
        if not status:
            db_local_session.close()
            return (status, existing_quiz_summary)

        # If quiz summary exists then update else insert
        if existing_quiz_summary:
            existing_quiz_summary.summary = llm_response
            db_local_session.commit()
            db_local_session.close()
        else:
            quiz_summary_details = {}
            quiz_summary_details["logged_in_user"] = user_id
            # insert_quiz_summary_details expects a list of summary dicts (it uses
            # add_all and indexes quiz_summary[0]); wrap the single summary in a list.
            quiz_summary_details["quiz_summary"] = [{
                "quiz_code": quiz_code,
                "user_id": user_id,
                "summary": llm_response
            }]

            (status, quiz_summary_confirmation) = core_crud.insert_quiz_summary_details(db_local_session, quiz_summary_details)
            if not status:
                db_local_session.close()
                return (status, quiz_summary_confirmation)

        return (True, f"Quiz summary updated for {quiz_code} successfully.")

    # Retrieve and update the quiz details
    def get_mcqs(self, quiz_code, user_id = None, type_of_submit = None):
        db_local_session = db_session.get_db()

        response_data = {}
        if type_of_submit == "start":
            (status, data) = core_crud.get_quiz_details(db_local_session, quiz_code = quiz_code, columns = ["quiz"])

            if not status:
                db_local_session.close()
                return (status, data)
                
            now = datetime.datetime.now(datetime.UTC)
            # end_time = now + datetime.timedelta(minutes = len(data) * 10)
            now = now.strftime(TS_FORMAT)
            # end_time = end_time.strftime(TS_FORMAT)

            # Update user ID and start time
            initial_state = {"quiz_code": quiz_code, "user_id": None, "logged_in_user": user_id}
            update_dict = {"user_id": user_id, "start_time": now}
            
            (status, output) = core_crud.update_quiz_details(db_local_session, initial_state, update_dict)
            if not status:
                db_local_session.close()
                return (status, output)
                
            # response_data["end_time"] = end_time
            
            mcqs = []
            for row in data:
                quiz_data = json.loads(row.quiz)
                for item in quiz_data:
                    item["user_response"] = ""
                    try:
                        del item["answer"]
                    except:
                        pass

                mcqs.extend(quiz_data)
            end_time = datetime.datetime.now(datetime.UTC) + datetime.timedelta(minutes=len(mcqs) * 2)
            response_data["end_time"] = end_time.strftime(TS_FORMAT)
            response_data["questions"] = mcqs

        elif type_of_submit == "resume":
            # Resume quiz knowing that start time os present and end time is not present
            (status, data) = core_crud.get_quiz_details(db_local_session, quiz_code = quiz_code, \
                    user_id = user_id, columns = ["user_response", "start_time"])

            if not status:
                db_local_session.close()
                return (status, data)

            mcqs = []

            if not data:
                return {"questions": [], "end_time": ""}

            for row in data:
                mcqs.extend(json.loads(row.user_response))
                
                response_data["start_time"] = row.start_time.strftime(TS_FORMAT)
                response_data["end_time"] = (row.start_time + datetime.timedelta(minutes = len(mcqs) * 2)).strftime(TS_FORMAT)
                
            response_data["questions"] = mcqs

        db_local_session.close()
        return (True, response_data)

    # Calculate the quiz score
    async def calculate_score(self, quiz_code, user_id, token):
        db_local_session = db_session.get_db()

        incorrect_responses = []
        correct_responses = []

        (status, data) = core_crud.get_quiz_details(db_local_session, quiz_code = quiz_code, \
                user_id = user_id, columns = ["id", "quiz", "user_response"])
        if not status:
            db_local_session.close()
            return (False, data)

        scores = []
        for row in data:
            score = 0
            if not row.quiz or not row.user_response:
                continue

            quiz = json.loads(row.quiz)

            if not quiz:
                continue

            # Compare user responses with correct responses
            user_response = json.loads(row.user_response)
            for element in quiz:
                question = element.get("question")

                for item in user_response:
                    if item.get("question") == question:
                        if element.get("answer").strip().lower() == item.get("user_response").strip().lower():
                            score += 20
                            correct_responses.append(question)
                        else:
                            incorrect_responses.append(question)

            scores.append(score)

            # Update quiz score per article
            initial_state = {"quiz_code": quiz_code, "quiz_id": row.id, "user_id": user_id, "logged_in_user": user_id}
            update_dict = {"score": score}

            (status, output) = core_crud.update_quiz_details(db_local_session, initial_state, update_dict)
            if not status:
                db_local_session.close()
                return (status, output)

        if len(scores) > 0:
            (status, message) = await self.update_quiz_summary(correct_responses, incorrect_responses, quiz_code, user_id, token)

            average_score = sum(scores)/len(scores)
            db_local_session.close()
            return (True, f"{str(average_score)}%")

        db_local_session.close()
        return (False, -1)

    # Calculate the quiz score (new version)
    async def calculate_score_v2(self, quiz_code, user_id, token):
        """
        Description: Calculate the quiz score for a user based on submitted responses and
        update quiz records with article-level scores.

        This method retrieves all quiz entries associated with the specified
        quiz code and user, compares the submitted answers against the stored
        correct answers, calculates scores at both article and overall quiz
        levels, updates the corresponding quiz records in the database, and
        generates a performance summary.

        Args:
        quiz_code (str): Unique identifier of the generated quiz.
        user_id (str): Identifier of the user who attempted the quiz.
        token (str): Authentication token used for generating the quiz performance summary.

        Returns:
        tuple:
            - (True, "<score>%") if score calculation is successful.
            - (False, error_message) if quiz details retrieval or database update fails.
            - (False, -1) if no valid quiz responses are available for evaluation.
        """
        db_local_session = db_session.get_db()

        incorrect_responses = []
        correct_responses = []

        (status, data) = core_crud.get_quiz_details(db_local_session, quiz_code = quiz_code, \
                user_id = user_id, columns = ["id", "quiz", "user_response"])
        if not status:
            db_local_session.close()
            return (False, data)
        total_questions = 0
        total_correct = 0
        scores = []
        for row in data:
            score = 0
            if not row.quiz or not row.user_response:
                continue

            quiz = json.loads(row.quiz)
            total_questions += len(quiz)

            if not quiz:
                continue

            # Compare user responses with correct responses
            user_response = json.loads(row.user_response)
            for element in quiz:
                question = element.get("question")

                for item in user_response:
                    if item.get("question") == question:
                        if element.get("answer").strip().lower() == item.get("user_response").strip().lower():
                            # score += 20
                            score += 1
                            total_correct += 1
                            correct_responses.append(question)
                        else:
                            incorrect_responses.append(question)

            # scores.append(score)
            article_score = round((score / len(quiz)) * 100, 2)
            scores.append(article_score)

            # Update quiz score per article
            initial_state = {"quiz_code": quiz_code, "quiz_id": row.id, "user_id": user_id, "logged_in_user": user_id}
            # update_dict = {"score": score}
            update_dict = {"score": article_score}
            (status, output) = core_crud.update_quiz_details(db_local_session, initial_state, update_dict)
            if not status:
                db_local_session.close()
                return (status, output)

        if len(scores) > 0:
            (status, message) = await self.update_quiz_summary(correct_responses, incorrect_responses, quiz_code, user_id, token)

            # average_score = sum(scores)/len(scores)
            average_score = round((total_correct / total_questions) * 100, 2)
            db_local_session.close()
            return (True, f"{str(average_score)}%")

        db_local_session.close()
        return (False, -1)

    # Submit user responses for a quiz 
    async def submit_quiz(self, quiz_code, user_id, type_of_submit, token, questions = []):
        db_local_session = db_session.get_db()

        (status, data) = core_crud.get_quiz_details(db_local_session, quiz_code = quiz_code, user_id = user_id)
        if not status:
            return (status, data)

        pointer = 0

        for row in data: 
            question_chunk = questions[pointer:pointer + 5]
            pointer += 5

            initial_state = {"quiz_code": quiz_code, "quiz_id": row.id, "user_id": user_id, "logged_in_user": user_id}
            update_dict = {"user_response": json.dumps(question_chunk, indent = 4)}

            (status, output) = core_crud.update_quiz_details(db_local_session, initial_state, update_dict)
            if not status:
                db_local_session.close()
                return (status, output)

        db_local_session.close()

        # Calculate score during submission
        if type_of_submit in ["submit", "expire"]:
            (status, score) = await self.calculate_score(quiz_code, user_id, token)
            if not status:
                return (status, score)
            
            remarks = "Pass" if float(score.strip("%")) >= self.pass_threshold else "Fail"
            return (True, (score, remarks))

        #return (False, (-1, "NA"))
        return (True, "Quiz responses saved successfully.")

    # Submit user responses for a quiz (new version)
    async def submit_quiz_v2(self, quiz_code, user_id, type_of_submit, token, questions = []):
        """
        Description: Save user responses for a quiz and calculate the final score when the
        quiz is submitted or expired.

        This method retrieves all quiz records associated with the specified
        quiz code and user, maps the submitted responses to their corresponding
        article-level quiz records, and stores the responses in the database.

        To support dynamic question distribution across multiple knowledge
        articles, the method determines the number of questions belonging to
        each article and slices the submitted response list accordingly.

        When the quiz is submitted or expires, the method triggers score
        calculation and determines the final pass/fail result based on the
        configured passing threshold.

        Args:
            quiz_code (str): Unique identifier for the generated quiz.
            user_id (str): Identifier of the user submitting the quiz.
            type_of_submit (str): Submission type. Supported values:
                - "submit" : User manually submits the quiz.
                - "expire" : Quiz is automatically submitted after expiry.
                - Any other value saves responses without scoring.
            token (str): Authentication token used for generating quiz performance summaries.
            questions (list, optional): List of user-submitted question responses. Defaults to an empty list.

        Returns:
            tuple:
                - (True, (score, remarks))
                when the quiz is submitted and scoring succeeds.
                - (False, error_message)
                if quiz retrieval, response update, or score calculation fails.
        """
        db_local_session = db_session.get_db()

        (status, data) = core_crud.get_quiz_details(db_local_session, quiz_code = quiz_code, user_id = user_id)
        if not status:
            return (status, data)

        pointer = 0

        for row in data: 
            # question_chunk = questions[pointer:pointer + 5]
            # pointer += 5
            quiz_questions = json.loads(row.quiz)
            question_count = len(quiz_questions)
            question_chunk = questions[pointer:pointer + question_count]
            pointer += question_count

            initial_state = {"quiz_code": quiz_code, "quiz_id": row.id, "user_id": user_id, "logged_in_user": user_id}
            update_dict = {"user_response": json.dumps(question_chunk, indent = 4)}

            (status, output) = core_crud.update_quiz_details(db_local_session, initial_state, update_dict)
            if not status:
                db_local_session.close()
                return (status, output)

        db_local_session.close()

        # Calculate score during submission
        if type_of_submit in ["submit", "expire"]:
            (status, score) = await self.calculate_score_v2(quiz_code, user_id, token)
            if not status:
                return (status, score)
            
            remarks = "Pass" if float(score.strip("%")) >= self.pass_threshold else "Fail"
            return (True, (score, remarks))

        #return (False, (-1, "NA"))
        return (True, "Quiz responses saved successfully.")

    # Retrieve pending quizzes 
    def list_pending_quizzes(self, user_id):
        db_local_session = db_session.get_db()

        (status, data) = core_crud.get_quiz_details(db_local_session, user_id = user_id, \
                quiz_status = "pending", columns = ["id", "quiz_code", "start_time", "kb_number"])
        if not status:
            db_local_session.close()
            return (status, data)

        # Group knowledge articles by quiz code
        kb_groups = {}
        for row in data:
            if row.quiz_code not in kb_groups:
                kb_groups[row.quiz_code] = []

            kb_groups[row.quiz_code].append(row.kb_number)

        pending_quizzes = []

        for quiz_code, kb_numbers in kb_groups.items():
            quiz_dict = {}
            quiz_dict["quiz_code"] = quiz_code

            (status, quiz_description) = core_crud.get_quiz_description(db_local_session, kb_numbers)
            if not status:
                return (status, quiz_description)

            quiz_dict["description"] = quiz_description
            pending_quizzes.append(quiz_dict)

        db_local_session.close()
        return (True, pending_quizzes)

    # Retrieve completed quizzes
    def list_completed_quizzes(self, user_id):
        db_local_session = db_session.get_db()

        (status, quiz_data) = core_crud.get_quiz_details(db_local_session, user_id = user_id, \
                quiz_status = "completed", columns = ["id", "user_id", "quiz_code", "start_time", "kb_number", "score", "quiz"])

        if not status:
            db_local_session.close()
            return (status, quiz_data)

        # Group quizzes by quiz code
        quiz_groups = {}
        for row in quiz_data:
            if row.quiz_code not in quiz_groups:
                quiz_groups[row.quiz_code] = {"scores": [], "kb_numbers": []}

            quiz_groups[row.quiz_code]["scores"].append(row.score)
            quiz_groups[row.quiz_code]["kb_numbers"].append(row.kb_number)

        # Build summary map per quiz code
        summary_map = {}
        for qc in quiz_groups.keys():
            (sum_status, sum_rows) = core_crud.get_quiz_summary_details(db_local_session, qc, user_id, columns = ["quiz_code", "summary"])
            if sum_status and sum_rows:
                summary_map[qc] = sum_rows[0].summary

        completed_quizzes = []
        for quiz_code, quiz_details in quiz_groups.items():
            if len(quiz_details["scores"]) > 0:
                # Average score and result tag
                average_score = round(sum(quiz_details["scores"]) / len(quiz_details["scores"]), 2)
                remarks = "Pass" if average_score >= self.pass_threshold else "Fail"

            (status, quiz_description) = core_crud.get_quiz_description(db_local_session, quiz_details["kb_numbers"])
            if not status:
                return (status, quiz_description)

            # Completed quiz details
            temp_quiz = {
                    "quiz_code": quiz_code,
                    "kb_numbers": quiz_details["kb_numbers"],
                    "description": quiz_description["description"],
                    "score": average_score,
                    "remarks": remarks,
                    "category": quiz_description["category"],
                    "sub_category": quiz_description["sub_category"],
                    "summary": summary_map.get(quiz_code, "Not Generated")
                    }

            completed_quizzes.append(temp_quiz)

        db_local_session.close()
        return (True, completed_quizzes)
    
    # Retrieve all quizzes
    def list_all_quizzes(self, user_id = None):
        db_local_session = db_session.get_db()

        (status, data) = core_crud.get_quiz_details(db_local_session, user_id = user_id, \
                columns = ["id", "user_id", "quiz_code", "start_time", "kb_number", "score","quiz"])
        if not status:
            db_local_session.close()
            return (status, data)

        # Group quizzes by quiz code
        quiz_groups = {}
        for row in data:
            if row.quiz_code not in quiz_groups:
                quiz_groups[row.quiz_code] = {"scores": [], "kb_numbers": [], "question_count": 0}

            quiz_groups[row.quiz_code]["scores"].append(row.score)
            quiz_groups[row.quiz_code]["kb_numbers"].append(row.kb_number)

            try:
                quiz_groups[row.quiz_code]["question_count"] += len(json.loads(row.quiz))
            except Exception:
                pass
            quiz_groups[row.quiz_code]["start_time"] = row.start_time
            quiz_groups[row.quiz_code]["user_id"] = row.user_id
        
        quizzes = []
        for quiz_code, quiz_details in quiz_groups.items():
            if len(quiz_details["scores"]) > 0:
                # Average score and result tag
                try:
                    average_score = round(sum(quiz_details["scores"]) / len(quiz_details["scores"]), 2)
                except Exception:
                    average_score = -1

                if average_score > -1:
                    remarks = "Pass" if average_score >= self.pass_threshold else "Fail"
                else:
                    remarks = "NA"

            # Quiz status check
            if quiz_details["start_time"] != None:
                try:
                    end_time = quiz_details["start_time"] + datetime.timedelta(minutes = quiz_details["question_count"] * 2)
                    end_time = end_time.replace(tzinfo = datetime.timezone.utc)
                except Exception:
                    pass

                quiz_status = "completed" if datetime.datetime.now(datetime.UTC) > end_time or average_score != -1 else "resume"
            else:
                quiz_status = "not started"

            (status, quiz_description) = core_crud.get_quiz_description(db_local_session, quiz_details["kb_numbers"])
            if not status:
                return (status, quiz_description)

            # Quiz details
            temp_quiz = {
                    "quiz_code": quiz_code,
                    "user_id": quiz_details["user_id"],
                    "kb_numbers": quiz_details["kb_numbers"],
                    "description": quiz_description["description"],
                    "score": average_score,
                    "remarks": remarks,
                    "category": quiz_description["category"],
                    "sub_category": quiz_description["sub_category"],
                    "status": quiz_status
                    }

            quizzes.append(temp_quiz)

        db_local_session.close()
        return (True, quizzes)

    # Retrieve questions with incorrect responses
    def list_questions_with_incorrect_responses(self, quiz_code, user_id):
        db_local_session = db_session.get_db()

        (status, data) = core_crud.get_quiz_details(db_local_session, quiz_code = quiz_code, \
                user_id = user_id, columns = ["id", "quiz", "user_response"])

        if not status:
            db_local_session.close()
            return (status, data)

        incorrect_responses = []

        for row in data:
            quiz = json.loads(row.quiz)

            if not quiz:
                continue

            # Compare user responses with correct responses
            user_response = json.loads(row.user_response)
            for element in quiz:
                question = element.get("question")

                for item in user_response:
                    if item.get("question") == question:
                        if element.get("answer").strip().lower() != item.get("user_response").strip().lower():
                            incorrect_responses.append(item)

        db_local_session.close()
        return (True, incorrect_responses)
