import { useQuery } from '@tanstack/react-query';
import { getIncidentByNumber } from '../services/get-incident-by-number';

function useGetIncidentByNumberQuery(incidentNumber: string) {
    const queryKey = ['get-incident-by-number', incidentNumber];

    const query = useQuery({
        queryKey: [...queryKey],
        queryFn: getIncidentByNumber.bind(null, { incidentNumber: incidentNumber }),
    });

    return { ...query, queryKey };
}

export default useGetIncidentByNumberQuery;
