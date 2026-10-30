# Author - Viraj Purandare
# Created On - June 14, 2024

import os
import datetime

import logging
import json
import requests

import core_crud
import db_session
import system_config_pa as scf

from pro_logger import log_event, application_logger

from incidents import ServiceNowIncidents

SCRIPT_PATH = os.path.dirname(__file__)

class ServiceNowCreateProblems:
    def __init__(self):
        configs = scf.get_system_config()
        itsm_tags = configs.get("itsm_tags", [])

        db_local_session = db_session.get_db()
        itsm_details = core_crud.get_itsm_connector_details_with_creds(db_local_session, itsm_tags[0])
        db_local_session.close()

        self.itsm_url = itsm_details.itsm_url
        self.itsm_tag = itsm_tags[0]

        if self.itsm_url.endswith('/'):
            self.itsm_url = self.itsm_url[:-1]

        self.itsm_username = itsm_details.itsm_user
        self.itsm_password = itsm_details.itsm_password

        proxy_url = (itsm_details.itsm_additional_config or {}).get("proxy_url")

        if proxy_url:
            self.proxies = {
              "http"  : proxy_url,
              "https" : proxy_url
            }
        else:
            self.proxies = None

        self.headers = {'content-type': 'application/json'}

    def create_problem(self):
        inc_obj = ServiceNowIncidents()
        priority_response = inc_obj.get_incidents_details(priority = "1")

        #print(priority_response)
        #exit()
        problem_url = self.itsm_url + '/api/now/table/problem'

        if priority_response == []:
            return []

        new_problems = []

        for response in priority_response:
            payload = {}
            payload['short_description'] = response['short_description']
            payload['problem'] = response['number']
            payload['description'] = response['description']
            payload['priority'] = response['priority']

            if response['assignment_group'] == '':
                payload['assignment_group'] = ''
            else:
                payload['assignment_group'] = response['assignment_group']['display_value']

            if response['assigned_to'] == '':
                payload['assigned_to'] = ''
            else:
                payload['assigned_to'] = response['assigned_to']['display_value']


            try:
                new_problem_response = requests.post(problem_url, auth = (self.itsm_username, self.itsm_password), \
                        data = json.dumps(payload), headers = self.headers, verify = False,proxies = self.proxies)

                output = {}
                output['number'] =  new_problem_response.json()['result']['number']
                output['sys_id'] = new_problem_response.json()['result']['sys_id']
                output['target_link'] = self.itsm_url + '/now/nav/ui/classic/params/target/problem.do%3Fsys_id%3D'\
                        + new_problem_response.json()['result']['sys_id']

                incident_url = self.itsm_url + '/api/now/table/incident/'+response['sys_id']
                inc_payload = {
                        "problem_id":output['sys_id']
                        }
                insert_incident = requests.patch(incident_url, auth = (self.itsm_username, self.itsm_password), \
                        data = json.dumps(inc_payload), headers = self.headers, verify = False,proxies = self.proxies)

                new_problems.append(output)

            except Exception as e:
                log_event(application_logger,
                          logging.ERROR,
                          f"Failed to create problem for incident {response.get('number', '')}: {str(e)}",
                          is_exception=True,
                          module_name="problem_assist",
                          component_type="itsm_request",
                          component_name="ServiceNowCreateProblems - create_problem")

        return new_problems
