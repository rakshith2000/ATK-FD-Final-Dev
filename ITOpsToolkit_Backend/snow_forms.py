import core_crud
from database import db_session


class Forms:

    def __init__(self):
        pass

    # Onboard Form
    def onboard_form(self, form_details):
        db_local_session = db_session.get_db()
        response = core_crud.onboard_form(
            db_local_session,
            form_details
        )
        db_local_session.close()
        return response

    # Get Form By Name
    def get_form_by_name(self, name):
        db_local_session = db_session.get_db()
        response = core_crud.get_form_by_name(
            db_local_session,
            name
        )
        db_local_session.close()
        return response

    # Update Form
    def update_form_inventory(self, form_details):
        db_local_session = db_session.get_db()
        response = core_crud.update_form_inventory(
            db_local_session,
            form_details
        )
        db_local_session.close()
        return response

    # Delete Form
    def delete_form(self, form_details):
        db_local_session = db_session.get_db()
        response = core_crud.delete_form(
            db_local_session,
            form_details
        )
        db_local_session.close()
        return response