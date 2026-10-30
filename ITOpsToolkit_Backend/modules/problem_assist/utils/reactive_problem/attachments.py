# Author - Viraj Purandare
# Created On - May 22, 2024

import os
import datetime

import logging
import requests

import pypdf
import openpyxl
import docx2txt
import extract_msg
import pandas as pd
from pypdf import PdfReader

import core_crud
import db_session
import system_config_pa as scf

from pro_logger import log_event, application_logger

TS_FORMAT = '%Y-%m-%d %H:%M:%S'
SCRIPT_PATH = os.path.dirname(__file__)

class ServiceNowAttachments:
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

    # Fetch attachment metadata
    def get_attachments_metadata(self, table, sys_id):
        target_url = self.itsm_url + '/api/now/attachment'

        filters = {}
        filters['sysparm_query'] = 'table_name=' + table + '^table_sys_id=' + sys_id

        if filters != {}:
            target_url += '?'

        for fl_nm, fl_val in filters.items():
            target_url += '&' + fl_nm + '=' + fl_val

        response = requests.get(target_url, auth = (self.itsm_username, self.itsm_password), \
                headers = self.headers, verify = False, proxies = self.proxies)
        response = response.json()['result']

        timezone_offset = self.get_timezone_offset()

        return response


    # Download attachments
    def download_attachments(self, attachments_metadata ): #, attachment_sys_id = None):
        file_paths = []

        for at_mtdt in attachments_metadata:
            filename = []

            if at_mtdt['file_name'] not in filename:
                filename.append(at_mtdt['file_name'])

            extension = ['txt', 'docx', 'pdf', 'xlsx', 'msg' ]
            target_url = at_mtdt['download_link']

            if at_mtdt['file_name'].split('.')[-1] not in extension and at_mtdt['file_name'] in  filename:
                continue

            try:
                response = requests.get(target_url, auth = (self.itsm_username, self.itsm_password), \
                        headers = self.headers, verify = False, proxies = self.proxies)

                temp_file_path = '/tmp/' + at_mtdt['file_name']

                if temp_file_path not in file_paths:
                    file_paths.append(temp_file_path)

                open(temp_file_path, 'wb+').write(response.content)

            except Exception as e:
                log_event(application_logger,
                          logging.ERROR,
                          f"Failed to download attachment {at_mtdt['file_name']}: {str(e)}",
                          is_exception=True,
                          module_name="problem_assist",
                          component_type="itsm_request",
                          component_name="ServiceNowAttachments - download_attachments")
                continue

        return file_paths

    # Read attachment
    def read_attachment(self, file_path):
        file_content = None

        content = { }

        filename = os.path.basename(rf'{file_path}')

        try:
            if file_path.lower().endswith('.txt'):
                fp = open(file_path, 'r')
                file_content = fp.read()
                fp.close()

            elif file_path.lower().endswith('.pdf'):
                reader = PdfReader(file_path)

                if len(reader.pages)> 1:
                    for i in range(len(reader.pages)):
                        page = reader.pages[i]
                        text = page.extract_text()
                    file_content = text
                else:
                    page = reader.pages[0]
                    file_content = page.extract_text()

            elif file_path.lower().endswith('.docx'):
                file_content = docx2txt.process(file_path)

            elif file_path.lower().endswith('.xlsx'):
                pd.set_option('display.max_colwidth', None)
                df = pd.read_excel(file_path, engine = 'openpyxl',sheet_name=None)

                for key,value in df.items():
                    file_content = str(value)

            elif file_path.lower().endswith('.msg'):
                msg = extract_msg.openMsg(file_path)
                file_content = msg.body

            else:
                return None

        except Exception as e:
            log_event(application_logger,
                      logging.ERROR,
                      f"Failed to read attachment {filename}: {str(e)}",
                      is_exception=True,
                      module_name="problem_assist",
                      component_type="itsm_request",
                      component_name="ServiceNowAttachments - read_attachment")
            return None

        os.remove(file_path)

        return file_content

    # To compensate difference in timezones, find time offset of user timezone w.r.t. UTC
    def get_timezone_offset(self):
        target_url = self.itsm_url + '/api/now/table/sys_user'

        filters = {}
        filters['sysparm_fields'] = 'sys_created_on'
        filters['sysparm_query'] = 'user_name=' + self.itsm_username

        if filters != {}:
            target_url += '?'

        for fl_nm, fl_val in filters.items():
            target_url += '&' + fl_nm + '=' + fl_val

        response = requests.get(target_url, auth = (self.itsm_username, self.itsm_password), \
                headers = self.headers, verify = False, proxies = self.proxies)

        utc_ts_obj = datetime.datetime.strptime(response.json()['result'][0]['sys_created_on'], TS_FORMAT)

        response = requests.get(target_url, auth = (self.itsm_username, self.itsm_password), \
                headers = self.headers, verify = False, proxies = self.proxies)
        usr_ts_obj = datetime.datetime.strptime(response.json()['result'][0]['sys_created_on'], TS_FORMAT)

        return (utc_ts_obj - usr_ts_obj).total_seconds()

    # To attach an attachment
    def attach_attachment(self, filename, sys_id):
        #target_url = 'https://cisicmpengineering1.service-now.com/api/now/attachment/upload'

        target_url = self.itsm_url + '/api/now/attachment/upload'

        payload = {'table_name':'problem', 'table_sys_id':sys_id}

        files = {'file': (filename, open(SCRIPT_PATH+f'/output/{filename}', 'rb'),\
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document', {'Expires': '0'})}

        attachment_response = requests.post(target_url, auth = (self.itsm_username, self.itsm_password),\
                    files=files, data = payload )

        return 0
