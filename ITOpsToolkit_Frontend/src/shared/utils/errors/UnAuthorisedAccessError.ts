class UnAuthorisedAccessError extends Error {
    public readonly title: string;

    constructor(title: string, message: string) {
        super(message || 'This page or feature your are trying to access is not authorised for your account !');
        this.name = 'UnAuthorisedAccessError';
        this.title = title || 'Access Denied !';

        // for TypeScript inheritance
        Object.setPrototypeOf(this, UnAuthorisedAccessError.prototype);
    }
}

export default UnAuthorisedAccessError;
