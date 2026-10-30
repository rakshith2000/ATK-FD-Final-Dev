# Author - Vishwas K S, Ragavan Veerarajan & Viraj Purandare
# Created On - July 3, 2026


import pandas as pd
from datetime import datetime


class EmployeeDirectory:
    def __init__(self, excel_file):
        self.excel_file = excel_file
        self.shift_data = pd.read_excel(excel_file, sheet_name = "shifts", header=[0, 1], engine="openpyxl")
        self.legend_data = pd.read_excel(excel_file, sheet_name = "legend", engine="openpyxl")
        self.tower_data = pd.read_excel(excel_file, sheet_name = "towers", engine="openpyxl")

    def get_person_by_department(self, tower):
        result = self.tower_data[self.tower_data["Tower"].str.lower() == tower.lower()]
        return result["Name"].tolist()

    def get_department_by_person(self, name):
        result = self.tower_data[self.tower_data["Name"].str.lower() == name.lower()]
        return result["Tower"].tolist()

    def get_person_by_shift_and_tower(self, date_input, time_input, assignment_group: list):
        self.shift_data.columns = [str(col[0]).strip() for col in self.shift_data.columns]

        self.legend_data["StartTime"] = pd.to_datetime(self.legend_data["StartTime"], format="%H:%M:%S").dt.time
        self.legend_data["EndTime"] = pd.to_datetime(self.legend_data["EndTime"], format="%H:%M:%S").dt.time

        # User input
        input_date = date_input #input("Enter time in DD-MM-YYYY format: ")  # DD-MM-YYYY format
        #input_start = datetime.strptime("14:00:00", "%H:%M:%S").time()
        input_time = datetime.strptime(time_input, "%H:%M:%S").time()

        # Convert input date to match column format
        formatted_date = datetime.strptime(input_date, "%d-%m-%Y")
        # Merge tower info from towers sheet with shifts sheet
        self.shift_data.columns = ["_".join(col).strip() if isinstance(col, tuple) else col for col in self.shift_data.columns]

        # Extract static columns from towers and shifts sheet
        tower_info = self.tower_data
        # Extract static columns
        shift_info = self.shift_data[["Name", "Email", "Phone Number"]].copy()
        shift_info.columns = [["Name", "Email", "Phone Number"]]

        # Normalize Tower case
        tower_info["AssignmentGroup"] = tower_info["AssignmentGroup"].astype(str).str.lower()

        # Find the column for the input date
        date_columns = [col for col in self.shift_data.columns if pd.to_datetime(col, errors="coerce").date() == formatted_date.date()]

        if not date_columns:
            raise ValueError(f"Date {formatted_date} not found in shift data.")

        # Assume shift code is in the first sub-column under the date
        shift_column = date_columns[0]
        shift_info["ShiftCode"] = self.shift_data[shift_column]
        # Filter by Tower
        filtered_data = tower_info[tower_info["AssignmentGroup"].isin([group.lower() for group in assignment_group])]
        # Merge with legend
        merged = pd.merge(filtered_data, self.shift_data, on="Name", how="left")
        merged["ShiftCode"] = merged[shift_column]
        merged_df = pd.merge(merged, self.legend_data, on ="ShiftCode" , how = "left")
        # Check overlap
        def is_available(row):
            if pd.isna(row["StartTime"]) or pd.isna(row["EndTime"]):
                return False
            if row["StartTime"] < row["EndTime"]:
                return row["StartTime"] <= input_time <= row["EndTime"]
            else:
                return input_time >= row["StartTime"] or input_time <= row["EndTime"]

        available_people = merged_df[merged_df.apply(is_available, axis=1)]
        # Output result
        result = available_people[["Name", "Email", "Phone Number"]].drop_duplicates().to_dict(orient="records")

        return result

    def get_technology_towers(self):
        """
        Return all technology towers.
        """
        return self.tower_data["Tower"].unique().tolist()
    
    def get_assignment_group(self, tower: list):
        """
        Given the technology tower, return the corresponding assignment groups.
        """
        filtered_data = self.tower_data[self.tower_data["Tower"].isin(tower)]
        return filtered_data["AssignmentGroup"].unique().tolist()

 