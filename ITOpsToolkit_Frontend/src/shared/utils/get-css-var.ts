function getCssVar(name: string, fallback: string = ''): string {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name)?.trim();
    if (value) {
        return value;
    } else if (fallback) {
        return fallback;
    } else {
        return `${name}, if you see this, the CSS variable is not defined in :root`;
    }
}

export default getCssVar;
