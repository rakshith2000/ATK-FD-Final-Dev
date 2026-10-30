import { ateFetch, SOP_GENERATION_BASE } from "../../api/ateAuth";

const API_BASE_URL = SOP_GENERATION_BASE;

export const extractTextFromDocument = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await ateFetch(`${API_BASE_URL}/api/process-document`, SOP_GENERATION_BASE, {
      method: 'POST',
      body: formData,
      headers: {},  // let browser set Content-Type for FormData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) throw new Error('Failed to process document');
    return result.text;
  } catch (error) {
    throw new Error(`Failed to extract text from document: ${error.message}`);
  }
};

export const validateDocumentFile = (file) => {
  const maxSize = 10 * 1024 * 1024;
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/html',
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/json',
    'application/xml',
    'text/xml',
    'application/zip',
    'application/x-zip-compressed'
  ];
  const allowedExtensions = [
    '.pdf', '.docx', '.doc', '.pptx', '.ppt', '.xlsx', '.xls',
    '.html', '.htm', '.txt', '.md', '.csv', '.json', '.xml', '.zip'
  ];

  if (file.size > maxSize) {
    throw new Error('File size must be less than 10MB');
  }

  const fileName = file.name.toLowerCase();
  const isValidType = allowedTypes.includes(file.type) || 
                     allowedExtensions.some(ext => fileName.endsWith(ext));

  if (!isValidType) {
    throw new Error('Please upload a supported document (.pdf, .docx, .pptx, .xlsx, .html, .txt, .csv, .json, .xml, .md, .zip)');
  }

  return true;
};