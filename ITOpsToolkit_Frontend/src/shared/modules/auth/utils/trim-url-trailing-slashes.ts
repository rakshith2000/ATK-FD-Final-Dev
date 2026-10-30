const trimTrailingSlashes = (url: string): string => {
    let end = url.length;
    while (end > 0 && url[end - 1] === '/') end--;
    return url.slice(0, end);
};

export default trimTrailingSlashes;
