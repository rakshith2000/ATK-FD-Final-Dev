import type { MimDataResponse, MimIncidentDetails } from '../types';

export const getMimIncidentDetails = (mimData?: MimDataResponse): MimIncidentDetails | undefined => {
    if (!mimData?.incident_details) return undefined;
    if (Array.isArray(mimData.incident_details)) {
        return mimData.incident_details[0];
    }
    return mimData.incident_details;
};
