const buildTeamsMeetingLinkByThreadId = (threadId: string | null | undefined): string | null => {
    if (!threadId) return null;

    const encodedThreadId = encodeURIComponent(threadId);

    return `https://teams.microsoft.com/l/meetup-join/${encodedThreadId}/0`;
};

export default buildTeamsMeetingLinkByThreadId;
