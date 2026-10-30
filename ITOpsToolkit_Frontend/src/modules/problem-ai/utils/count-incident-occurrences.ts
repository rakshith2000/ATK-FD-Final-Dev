import type { AssociatedIncident } from '../types/problem-ai';

const countIncidentOccurrences = (incidents: AssociatedIncident[]): number => {
    return incidents.filter((i) => typeof i?.number === 'string' && i.number.toLowerCase().startsWith('inc')).length;
};

export default countIncidentOccurrences;
