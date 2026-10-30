export interface IncidentStatsGroupByField {
    stats: {
        count: string;
    };
    groupby_fields: Array<{
        field: string;
        value: string;
        display_value: string;
    }>;
}
