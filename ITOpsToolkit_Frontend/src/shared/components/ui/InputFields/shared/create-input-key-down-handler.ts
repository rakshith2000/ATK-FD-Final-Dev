export const createInputKeyDownHandler = (options: {
    allowSpaces?: boolean;
    allowedSpecialChars?: Array<string>;
    allowedNavKeys?: Array<string>;
    onlyNumbers?: boolean;
    onlyAlphabets?: boolean;
}) => {
    return (e: React.KeyboardEvent<HTMLInputElement>) => {
        const isNumber = /^[0-9]$/.test(e.key);
        const isAlphabet = /^[a-zA-Z]$/.test(e.key);
        const isAllowedSpecialChar = options.allowedSpecialChars?.includes(e.key) ?? false;
        const isAllowedNavKey = options.allowedNavKeys?.includes(e.key) ?? false;

        // Only numbers and/or alphabets allowed
        if (options.onlyNumbers && options.onlyAlphabets) {
            if (!isNumber && !isAlphabet && !isAllowedNavKey && !isAllowedSpecialChar) {
                e.preventDefault();
            }
            return;
        }

        // Only numbers allowed
        if (options.onlyNumbers) {
            if (!isNumber && !isAllowedNavKey && !isAllowedSpecialChar) {
                e.preventDefault();
            }
            return;
        }

        // Only alphabets allowed
        if (options.onlyAlphabets) {
            if (!isAlphabet && !isAllowedNavKey && !isAllowedSpecialChar) {
                e.preventDefault();
            }
            return;
        }

        if (e.key === ' ') {
            if (!options.allowSpaces) {
                e.preventDefault();
            }
        } else if (!isNumber && !isAlphabet && !isAllowedSpecialChar && !isAllowedNavKey) {
            e.preventDefault();
        }
    };
};
