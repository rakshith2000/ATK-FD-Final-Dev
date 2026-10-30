import { useState, useEffect, useRef } from 'react';

type AppSpeechRecognitionAlternative = {
    transcript: string;
};

type AppSpeechRecognitionResult = {
    0: AppSpeechRecognitionAlternative;
    isFinal: boolean;
    [index: number]: AppSpeechRecognitionAlternative;
};

interface AppSpeechRecognitionResultList {
    length: number;
    [index: number]: AppSpeechRecognitionResult;
}

interface AppSpeechRecognitionEvent {
    results: AppSpeechRecognitionResultList;
}

interface AppSpeechRecognitionErrorEvent {
    error: string;
}

type AppSpeechRecognition = {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onstart: (() => void) | null;
    onresult: ((event: AppSpeechRecognitionEvent) => void) | null;
    onerror: ((event: AppSpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
};

type SpeechRecognitionConstructor = new () => AppSpeechRecognition;

interface SpeechRecognitionWindow extends Window {
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    SpeechRecognition?: SpeechRecognitionConstructor;
}

const getSpeechRecognitionConstructor = (): SpeechRecognitionConstructor | undefined => {
    const win = window as SpeechRecognitionWindow;
    return win.SpeechRecognition || win.webkitSpeechRecognition;
};

export const useVoiceRecorder = () => {
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [listening, setListening] = useState(false);
    const [browserSupportsSpeechRecognition, setBrowserSupportsSpeechRecognition] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [permissionState, setPermissionState] = useState('unknown');
    const recognitionRef = useRef<AppSpeechRecognition | null>(null);

    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            setBrowserSupportsSpeechRecognition(true);

            if (navigator.permissions) {
                navigator.permissions
                    .query({ name: 'microphone' as PermissionName })
                    .then((result) => {
                        setPermissionState(result.state);
                        result.addEventListener('change', () => setPermissionState(result.state));
                    })
                    .catch(() => setPermissionState('unknown'));
            } else {
                setPermissionState('unknown');
            }
        }
    }, []);

    const requestMicrophonePermission = async () => {
        try {
            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error('getUserMedia is not supported in this browser');
            }
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach((track) => track.stop());
            return true;
        } catch {
            return false;
        }
    };

    const startListening = async () => {
        if (!browserSupportsSpeechRecognition) return false;

        try {
            if (!navigator.mediaDevices?.getUserMedia) {
                return false;
            }
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach((track) => track.stop());
        } catch (error: unknown) {
            const errorName = typeof error === 'object' && error !== null && 'name' in error ? String((error as { name?: unknown }).name) : undefined;

            if (errorName === 'NotFoundError') {
                setInterimTranscript('No microphone found. Please connect a microphone device.');
            } else if (errorName === 'NotAllowedError') {
                setInterimTranscript('Microphone access denied. Please enable microphone access in your browser settings.');
            } else {
                setInterimTranscript('Unable to access microphone. Please check your device settings.');
            }
            return false;
        }

        const SpeechRecognitionConstructor = getSpeechRecognitionConstructor();
        if (!SpeechRecognitionConstructor) {
            setInterimTranscript('Speech recognition is not supported in this browser.');
            return false;
        }

        const recognition = new SpeechRecognitionConstructor();
        recognitionRef.current = recognition;

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setListening(true);
            setIsProcessing(true);
            setTranscript('');
            setInterimTranscript('');
        };

        recognition.onresult = (event: AppSpeechRecognitionEvent) => {
            let finalText = '';
            let interimText = '';

            for (let i = 0; i < event.results.length; i++) {
                const result = event.results[i];
                const transcriptText = result[0].transcript;
                if (result.isFinal) {
                    finalText += transcriptText + ' ';
                } else {
                    interimText += transcriptText;
                }
            }

            if (finalText) {
                setTranscript((prev) => prev + finalText);
            }
            setInterimTranscript(interimText);
        };

        recognition.onerror = (event: AppSpeechRecognitionErrorEvent) => {
            setListening(false);
            setIsProcessing(false);
            if (event.error === 'not-allowed') setPermissionState('denied');
        };

        recognition.onend = () => {
            setListening(false);
            setIsProcessing(false);
        };

        try {
            recognition.start();
            return true;
        } catch {
            setListening(false);
            setIsProcessing(false);
            return false;
        }
    };

    const stopListening = () => {
        if (recognitionRef.current) recognitionRef.current.stop();
        setListening(false);
        setIsProcessing(false);
    };

    const resetTranscript = () => {
        setTranscript('');
        setInterimTranscript('');
    };

    return {
        transcript: transcript + interimTranscript,
        finalTranscript: transcript,
        interimTranscript,
        listening,
        isProcessing,
        permissionState,
        startListening,
        stopListening,
        resetTranscript,
        browserSupportsSpeechRecognition,
        requestMicrophonePermission,
    };
};
