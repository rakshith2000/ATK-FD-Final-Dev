# Author - Vishwas K S

# Default packages
import os
import json
import logging

# Global variables
SCRIPT_PATH = os.path.dirname(__file__)
ROOT_PATH = SCRIPT_PATH.split("modules")[0]

# Custom packages
from pro_logger import log_event, application_logger

def extract_and_validate_json(llm_resp):
    def RawJSONDecoder(index):
        class _RawJSONDecoder(json.JSONDecoder):
            end = None

            def decode(self, s, *_):
                data, self.__class__.end = self.raw_decode(s, index)
                return data
        return _RawJSONDecoder

    def extract_json(s, index = 0):
        results = []
        while (index := s.find("{", index)) != -1:
            try:
                json_obj = json.loads(s, cls=(decoder := RawJSONDecoder(index)))
                results.append(json_obj)
                index = decoder.end
            except json.JSONDecodeError as e:
                
                # Application logging
                log_event(application_logger,
                          logging.ERROR,
                          f"Invalid LLM response - Formatting Error - {str(e)}",
                          module_name = "train_assist",
                          component_type = "supporting_util",
                          component_name = "extract_json - extract_json")
            
                return (False, f"Invalid LLM response - Formatting Error - {str(e)}")

        return (True, results) 

    return extract_json(llm_resp)
 