
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { encodeBase64, decodeBase64, decodeAudioData } from '../services/geminiService';

const LiveOmniView: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [transcriptions, setTranscriptions] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);

  const stopSession = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsActive(false);
    nextStartTimeRef.current = 0;
    sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    sourcesRef.current.clear();
  }, []);

  const startSession = async () => {
    try {
      setIsActive(true);
      // Fix: Always use process.env.API_KEY directly in named parameter as per guidelines
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      streamRef.current = stream;

      if (videoRef.current) videoRef.current.srcObject = stream;

      const inputAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = outputAudioCtx;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: 'You are Gemini Omnis, the creative brain of Azmeer AI Studio. You have vision and hearing. Help users brainstorm cinema prompts, Sora video ideas, or just chat. Be helpful, concise, and creative.',
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            // Audio Stream Input
            const source = inputAudioCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              const pcmBlob = {
                data: encodeBase64(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioCtx.destination);

            // Visual Stream Input (1 FPS)
            const vInterval = setInterval(() => {
              if (videoRef.current && canvasRef.current && sessionRef.current) {
                const canvas = canvasRef.current;
                const video = videoRef.current;
                canvas.width = 320;
                canvas.height = 240;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
                const base64Frame = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
                sessionPromise.then(s => s.sendRealtimeInput({ media: { data: base64Frame, mimeType: 'image/jpeg' } }));
              } else if (!sessionRef.current) {
                clearInterval(vInterval);
              }
            }, 1000);
          },
          onmessage: async (msg) => {
            if (msg.serverContent) {
              const sc = msg.serverContent;
              
              if (sc.inputTranscription) setTranscriptions(prev => [...prev, { role: 'user', text: sc.inputTranscription!.text || "" }]);
              if (sc.outputTranscription) setTranscriptions(prev => [...prev, { role: 'model', text: sc.outputTranscription!.text || "" }]);

              const audioData = sc.modelTurn?.parts?.[0]?.inlineData?.data;
              if (audioData) {
                const buffer = await decodeAudioData(decodeBase64(audioData), outputAudioCtx, 24000, 1);
                const source = outputAudioCtx.createBufferSource();
                source.buffer = buffer;
                source.connect(outputAudioCtx.destination);
                
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioCtx.currentTime);
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += buffer.duration;
                sourcesRef.current.add(source);
                source.onended = () => sourcesRef.current.delete(source);
              }

              if (sc.interrupted) {
                sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
              }
            }
          },
          onerror: (e) => console.error('Live Error:', e),
          onclose: () => stopSession(),
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error(err);
      setIsActive(false);
    }
  };

  useEffect(() => {
    return () => stopSession();
  }, [stopSession]);

  return (
    <div className="flex flex-col h-full bg-[#020617] p-6 md:p-12 animate-up overflow-hidden">
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-cyan-500 animate-pulse shadow-[0_0_12px_cyan]' : 'bg-slate-800'}`}></div>
            <p className="text-cyan-500 text-[10px] font-black uppercase tracking-[0.5em]">Neural Multimodal Node</p>
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase leading-none">
            Omnis <span className="text-slate-800">Live</span>
          </h2>
        </div>
        <button
          onClick={isActive ? stopSession : startSession}
          className={`px-12 py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-2xl ${
            isActive 
              ? 'bg-rose-600/10 text-rose-500 border border-rose-500/30 hover:bg-rose-600 hover:text-white' 
              : 'bg-cyan-600 text-white hover:bg-cyan-500 active:scale-95'
          }`}
        >
          {isActive ? 'Terminate Connection' : 'Establish Link'}
        </button>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-0">
        <div className="lg:col-span-7 relative rounded-[3rem] overflow-hidden bg-slate-950 border border-white/5 shadow-2xl group">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transition-all duration-1000 ${isActive ? 'opacity-100' : 'opacity-20 grayscale'}`}
          />
          <canvas ref={canvasRef} className="hidden" />
          
          {!isActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-800 space-y-4">
              <svg className="w-20 h-20 opacity-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" strokeWidth={1}/></svg>
              <p className="text-[9px] font-black uppercase tracking-[0.5em]">Sensor Array Standby</p>
            </div>
          )}

          {isActive && (
            <div className="absolute top-8 left-8">
               <div className="bg-cyan-500/20 backdrop-blur-xl border border-cyan-500/40 px-5 py-2 rounded-full flex items-center gap-3">
                  <div className="w-2 h-2 bg-cyan-500 rounded-full animate-ping"></div>
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">Live Visual Uplink</span>
               </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 glass-panel rounded-[3rem] border border-white/5 flex flex-col min-h-0 shadow-2xl">
          <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Neural Stream Log</span>
            <div className="flex gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
            {transcriptions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-700 text-center px-10 space-y-6">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] leading-relaxed opacity-50">
                  Ready for multimodal creative direction.
                </p>
              </div>
            ) : (
              transcriptions.slice(-20).map((t, idx) => (
                <div key={idx} className={`flex flex-col ${t.role === 'user' ? 'items-end' : 'items-start'} animate-up`}>
                  <span className="text-[8px] text-slate-600 uppercase font-black mb-2 px-3 tracking-widest">{t.role}</span>
                  <div className={`max-w-[90%] px-6 py-4 rounded-[1.5rem] text-xs font-medium leading-relaxed ${
                    t.role === 'user' 
                      ? 'bg-cyan-600/10 text-cyan-200 border border-cyan-500/20' 
                      : 'bg-slate-900/60 text-slate-300 border border-white/5'
                  }`}>
                    {t.text}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-8 bg-black/20 border-t border-white/5 text-center">
             <div className="flex justify-center gap-10">
                <div className="space-y-2">
                   <div className={`w-1 h-1 mx-auto rounded-full ${isActive ? 'bg-cyan-500' : 'bg-slate-800'}`}></div>
                   <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest">Audio</span>
                </div>
                <div className="space-y-2">
                   <div className={`w-1 h-1 mx-auto rounded-full ${isActive ? 'bg-purple-500' : 'bg-slate-800'}`}></div>
                   <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest">Vision</span>
                </div>
                <div className="space-y-2">
                   <div className={`w-1 h-1 mx-auto rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-800'}`}></div>
                   <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest">Latency</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveOmniView;