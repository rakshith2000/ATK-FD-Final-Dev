/**
 * Reads a File and resolves to a base64 data URL string (e.g. "data:image/png;base64,....").
 * Used to serialise an uploaded image before sending it to the change management APIs.
 */
export default function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}
