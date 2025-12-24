
import React, { useState, useRef, useEffect } from 'react';
import { generateChatResponse, generateGeminiTTS, decodeBase64, decodeAudioData } from '../services/geminiService';
import { ChatMessage } from '../types';

const ChatView: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'model',
      content: "Hai! Saya pembantu AI anda. Ada apa-apa yang saya boleh bantu untuk buat video atau brainstorm idea hari ini?",
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const result = await generateChatResponse(input);
      const modelMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: result || 'Maaf, sistem sedang sibuk. Sila cuba lagi.',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, modelMessage]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleTTS = async (message: ChatMessage) => {
    if (playingId === message.id) return;

    try {
      setPlayingId(message.id);
      const base64Audio = await generateGeminiTTS(message.content);
      
      if (base64Audio) {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const ctx = audioContextRef.current;
        const buffer = await decodeAudioData(decodeBase64(base64Audio), ctx, 24000, 1);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.onended = () => setPlayingId(null);
        source.start();
      } else {
        setPlayingId(null);
      }
    } catch (error) {
      console.error("TTS gagal:", error);
      setPlayingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#020617] animate-up">
      <header className="px-8 py-6 border-b border-slate-800/50 bg-slate-900/20 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
          <h2 className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.4em]">Pembantu AI Azmeer</h2>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`group relative max-w-[85%] rounded-[2rem] px-8 py-6 text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-cyan-600 text-white shadow-2xl shadow-cyan-900/20' 
                : 'bg-slate-900/40 border border-white/5 text-slate-200'
            }`}>
              <div className="whitespace-pre-wrap italic">"{msg.content}"</div>
              
              {msg.role === 'model' && (
                <button 
                  onClick={() => handleTTS(msg)}
                  className={`absolute -right-12 top-2 p-3 rounded-xl transition-all duration-300 opacity-0 group-hover:opacity-100 ${
                    playingId === msg.id ? 'bg-cyan-500/20 text-cyan-400 opacity-100' : 'bg-slate-800 text-slate-500 hover:text-cyan-400'
                  }`}
                >
                  {playingId === msg.id ? (
                    <div className="flex gap-1 items-center h-4">
                      <span className="w-1 bg-cyan-400 animate-bounce"></span>
                      <span className="w-1 bg-cyan-400 animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-1 bg-cyan-400 animate-bounce [animation-delay:0.4s]"></span>
                    </div>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-slate-900/40 border border-white/5 rounded-[2rem] px-8 py-6 flex gap-2">
              <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}
      </div>

      <div className="p-8 bg-gradient-to-t from-[#020617] via-[#020617] to-transparent">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto relative group">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tanya apa-apa kat sini..."
            className="w-full bg-slate-900/60 border border-white/10 focus:border-cyan-500/50 rounded-[2rem] py-6 pl-10 pr-20 text-sm text-slate-200 outline-none transition-all group-hover:border-white/20 focus:ring-8 focus:ring-cyan-500/5"
          />
          <button
            disabled={isTyping || !input.trim()}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 p-4 rounded-2xl transition-all shadow-xl shadow-cyan-900/20"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
          </button>
        </form>
        <p className="text-center text-[8px] text-slate-700 mt-6 uppercase tracking-[0.4em]">
          Azmeer AI Sembang v3.0 - Powered by Gemini
        </p>
      </div>
    </div>
  );
};

export default ChatView;
