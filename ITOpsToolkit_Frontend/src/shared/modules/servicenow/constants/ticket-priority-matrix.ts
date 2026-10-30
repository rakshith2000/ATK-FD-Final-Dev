const ticketPriorityMatrix = {
    '1-1': 1, // High Urgency + High Impact = 1 (Critical)
    '1-2': 2, // High Urgency + Mid Impact = 2 (High)
    '1-3': 3, // High Urgency + Low Impact = 3 (Moderate)
    '2-1': 2, // Mid Urgency + High Impact = 2 (High)
    '2-2': 3, // Mid Urgency + Mid Impact = 3 (Moderate)
    '2-3': 4, // Mid Urgency + Low Impact = 4 (Low)
    '3-1': 3, // Low Urgency + High Impact = 3 (Moderate)
    '3-2': 4, // Low Urgency + Mid Impact = 4 (Low)
    '3-3': 5, // Low Urgency + Low Impact = 5 (Planning)
} satisfies Record<string, number>;

export default ticketPriorityMatrix;
