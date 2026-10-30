import { useState, useEffect, useRef } from 'react';

export const useVoiceRecorder = () => {
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const [browserSupportsSpeechRecognition, setBrowserSupportsSpeechRecognition] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [permissionState, setPermissionState] = useState('unknown');
  const recognitionRef = useRef(null);
  
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setBrowserSupportsSpeechRecognition(true);
      
      if (navigator.permissions) {
        navigator.permissions.query({ name: 'microphone'as any  }).then((result) => {
          setPermissionState(result.state);
          result.addEventListener('change', () => setPermissionState(result.state));
        }).catch(() => setPermissionState('unknown'));
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
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.log('Microphone permission denied:', error);
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
      stream.getTracks().forEach(track => track.stop());
    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        setInterimTranscript('No microphone found. Please connect a microphone device.');
      } else if (error.name === 'NotAllowedError') {
        setInterimTranscript('Microphone access denied. Please enable microphone access in your browser settings.');
      } else {
        setInterimTranscript('Unable to access microphone. Please check your device settings.');
      }
      return false;
    }
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
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
    
    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';
      
      for (let i = 0; i < event.results.length; i++) {
        const transcriptText = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcriptText + ' ';
        } else {
          interimText += transcriptText;
        }
      }
      
      if (finalText) {
        setTranscript(prev => prev + finalText);
      }
      setInterimTranscript(interimText);
    };
    
    recognition.onerror = (event) => {
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
    } catch (error) {
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
    browserSupportsSpeechRecognition
  };
};