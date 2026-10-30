import { ateFetch, SOP_GENERATION_BASE } from '@/api/ateAuth';

const API_BASE_URL = SOP_GENERATION_BASE;

export const extractTextFromDocument = async (file: File): Promise<string> => {
    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await ateFetch(`${API_BASE_URL}/api/process-document`, SOP_GENERATION_BASE, {
            method: 'post',
            data: formData,
        });

        if (response.status < 200 || response.status >= 300) {
            const errorData = response.data || {};
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }

        const result = response.data;
        if (!result?.success) throw new Error('Failed to process document');
        return result.text;
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to extract text from document: ${message}`);
    }
};

export const validateDocumentFile = (file: File): boolean => {
    const maxSize = 10 * 1024 * 1024;
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
    const allowedExtensions = ['.pdf', '.docx', '.doc'];

    if (file.size > maxSize) {
        throw new Error('File size must be less than 10MB');
    }

    const fileName = file.name.toLowerCase();
    const isValidType = allowedTypes.includes(file.type) || allowedExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValidType) {
        throw new Error('Please upload a PDF or Word document (.pdf, .docx, .doc)');
    }

    return true;
};
