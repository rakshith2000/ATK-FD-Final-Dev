import axios from 'axios';

function makeAxiosError(message: string, status: number, data: unknown, statusText = ''): InstanceType<typeof axios.AxiosError> {
    return new axios.AxiosError(message, String(status), undefined, undefined, {
        data,
        status,
        statusText,
        headers: {},
        config: {} as never,
    });
}

export default makeAxiosError;
