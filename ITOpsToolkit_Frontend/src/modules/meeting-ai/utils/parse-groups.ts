export function parseGroups(groups: string | null | undefined): string[] {
    return (groups ?? '')
        .split('|')
        .map((g) => g.trim())
        .filter(Boolean);
}
