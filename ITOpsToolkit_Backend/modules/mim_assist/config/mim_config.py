# Author - Viraj Purandare, Vishwas K S and Ragavan Veerarajan
# Created On - July 4, 2026

import os

import core_crud
from vault import Vault


class DefaultConfig:
    """ Bot Configuration """

    vault_obj = Vault(core_crud.VAULT_TYPE)
    (status, value) = vault_obj.read_secret("mim_tenant_secret")

    if not status:
        USER_ID = APP_TENANTID = None
    else:
        USER_ID = value[0]
        APP_TENANTID = value[1]

    (status, value) = vault_obj.read_secret("mim_client_secret")

    if not status:
        CLIENT_ID = CLIENT_SECRET = None
    else:
        APP_ID = CLIENT_ID = value[0]
        APP_PASSWORD = CLIENT_SECRET = value[1]
    
    APP_TYPE = os.getenv("APP_TYPE", "SingleTenant")
    SA_CLIENT_ID = os.getenv("SA_CLIENT_ID", "service_account_client")
    PORT = os.getenv("MIM_APP_PORT", 3978)

