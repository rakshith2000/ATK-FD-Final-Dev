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

SCRIPT_PATH = os.path.dirname(__file__)

class ServiceNowProblems:
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

    # Fetch list of problem tickets
    def get_problems_details(self, start_ts = None, end_ts = None, number = None):
        target_url = self.itsm_url + '/api/now/table/problem'

        filters = {}

        if start_ts != None and end_ts != None:
            start_ts_obj = datetime.datetime.strptime(start_ts, '%Y-%m-%d %H:%M:%S')
            end_ts_obj = datetime.datetime.strptime(end_ts, '%Y-%m-%d %H:%M:%S')

            if end_ts_obj < start_ts_obj:
                return []

            [start_date, start_time] = start_ts.split(' ')
            [end_date, end_time] = end_ts.split(' ')



        if number != None and (start_ts != None and end_ts != None):
            filters['sysparm_query'] += '^number=' + number
        elif number != None:
            filters['sysparm_query'] = 'number=' + number
        elif start_ts == None and end_ts == None:
            return []

        filters['sysparm_fields'] = 'sys_id,number,start_date,end_date,short_description,description,assigned_to,priority,assignment_group,cmdb_ci,comments_and_work_notes,close_notes,company'
        filters['sysparm_display_value'] = 'true'
        # filters['sysparm_exclude_reference_link'] = 'true'

        if filters != {}:
            target_url += '?'

        for fl_nm, fl_val in filters.items():
            target_url += '&' + fl_nm + '=' + fl_val
        try:
            response = requests.get(target_url, auth = (self.itsm_username, self.itsm_password), \
                    headers = self.headers, verify = False, proxies = self.proxies)
        except Exception as e:
            log_event(application_logger,
                      logging.ERROR,
                      f"Failed to fetch problem details: {str(e)}",
                      is_exception=True,
                      module_name="problem_assist",
                      component_type="itsm_request",
                      component_name="ServiceNowProblems - get_problems_details")
            return []
        return response.json()['result']

    # Update problem ticket
    def update_problem(self, problem_sys_id,work_notes = '', table = 'problem' ):
        target_url = self.itsm_url + '/api/now/table/' + table + '/' + problem_sys_id

        payload = {}


        if work_notes.strip() != '':
            payload['work_notes'] = work_notes

        try:
            response = requests.put(target_url, auth = (self.itsm_username, self.itsm_password), \
                    data = json.dumps(payload), headers = self.headers, verify = False,proxies = self.proxies)
            #print(response)
        except Exception as e:
            log_event(application_logger,
                      logging.ERROR,
                      f"Failed to update problem {problem_sys_id}: {str(e)}",
                      is_exception=True,
                      module_name="problem_assist",
                      component_type="itsm_request",
                      component_name="ServiceNowProblems - update_problem")

        return 0
