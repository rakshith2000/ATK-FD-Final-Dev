# Author - Viraj Purandare
# Created On - October 4, 2025

# Default packages
import re

# Third party packages
import spacy

class LLMAnonymityAddon:
    def __init__(self, original_prompt, sanitized_prompt):
        self.original_prompt = original_prompt
        self.sanitized_prompt = sanitized_prompt
        self.anonymity_map = {}

    # This anonymity map is created with assumption to use in conjunction with llm-guard python package.
    # llmguard package replaces the PII with 1 word.
    def create_anonymity_map(self):
        original_prompt_copy = self.original_prompt

        # Custom REGEX comptible to llm-guard python package
        redacted_items = re.findall(r"\[REDACTED_[A-Z_0-9]+\]", self.sanitized_prompt)
        redacted_remainings = re.split(r"\[REDACTED_[A-Z_0-9]+\]", self.sanitized_prompt)

        ptr = 0
        k = 0

        for i in range(len(redacted_remainings)):
            # Condition to handle any REDACTED in the beginning of the prompt
            if redacted_remainings[i] == "":
                temp = ["", original_prompt_copy]
            elif redacted_remainings[i] == " ":
                temp = [" ", original_prompt_copy]
            else:
                temp = original_prompt_copy.split(redacted_remainings[i])

            if k >= len(redacted_items):
                break
            elif i + 1 < len(redacted_remainings):
                # Condition to handle any sequential REDACTED in the prompt
                next_null = 1
                if redacted_remainings[i + 1] in ["", " "]:
                    for l in range(i + 1, len(redacted_remainings)):
                        if redacted_remainings[l] not in ["", " "]:
                            self.anonymity_map[redacted_items[k]] = temp[1].split(redacted_remainings[l])[0]
                            next_null = 0
                            break

                    if next_null == 1:
                        self.anonymity_map[redacted_items[k]] = temp[1]
                else:
                    self.anonymity_map[redacted_items[k]] = temp[1].split(redacted_remainings[i + 1])[0]
            else:
                self.anonymity_map[redacted_items[k]] = temp[1]

            if redacted_remainings[i] != "":
                original_prompt_copy = redacted_remainings[i].join(original_prompt_copy.split(redacted_remainings[i])[1:])

            k += 1

    # Restore anonymous keywords by originals in response by LLM
    def restore_anonymity(self, response):
        for san, org in self.anonymity_map.items():
            response = response.replace(san, org)
        
        '''
        # Remove repetations using NLP library
        nlp = spacy.load("en_core_web_sm")
        doc = nlp(response)

        cleaned_tokens = []
        prev_token = None

        for token in doc:
            # Skip punctuations and spaces
            if token.is_punct or token.is_space:
                cleaned_tokens.append(token.text)
                continue
                
            # Avoid repeating the same word (case-insensitive)
            if prev_token and token.text.lower() == prev_token.text.lower():
                continue

            cleaned_tokens.append(token.text)
            prev_token = token

        return " ".join(cleaned_tokens)
        '''

        # Leverage sliding window mechanism
        words = response.split()
        max_ngram = 5

        cleaned = []
        i = 0

        while i < len(words):
            found_repeat = False
            for n in range(max_ngram, 1, -1):
                if i + 2 * n <= len(words):
                    phrase_1 = words[i:i + n]
                    phrase_2 = words[i + n:i + 2 * n]
                    if phrase_1 == phrase_2:
                        cleaned.extend(phrase_1)
                        i += 2 * n
                        found_repeat = True
                        break
            
            if not found_repeat:
                cleaned.append(words[i])
                i += 1

        return " ".join(cleaned)
