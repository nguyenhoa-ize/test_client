"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { MaterialIcon } from "./MaterialIcon";

interface Message {
  from: "user" | "bot";
  text: string;
  timestamp: Date;
  isError?: boolean;
}

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      from: "bot",
      text: "Xin chào! Tôi là Solace AI, được hỗ trợ bởi Google Gemini. Tôi có thể giúp gì cho bạn? 😊",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<"ready" | "loading" | "error">("ready");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      from: "user",
      text: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const historyForAPI = messages.map(msg => ({
        role: msg.from === "user" ? "user" : "assistant",
        parts: [{ text: msg.text }]
      }));
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: input.trim(),
          history: historyForAPI
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      const botReply = data.reply || "Xin lỗi, tôi không hiểu. Bạn có thể nói rõ hơn không?";

      const botMessage: Message = {
        from: "bot",
        text: botReply,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
      setApiStatus("ready");
    } catch (error) {
      console.error("Chatbot error:", error);
      
      // Fallback responses khi API lỗi
      const fallbackResponses = [
        "Xin lỗi, tôi đang gặp sự cố kỹ thuật. Bạn có thể thử lại sau không?",
        "Tôi không thể kết nối được. Bạn có thể hỏi lại được không?",
        "Có vẻ như có lỗi xảy ra. Bạn có thể mô tả vấn đề của mình không?",
        "Tôi đang bận, bạn có thể thử lại sau được không?"
      ];
      
      const botMessage: Message = {
        from: "bot",
        text: fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)],
        timestamp: new Date(),
        isError: true
      };

      setMessages(prev => [...prev, botMessage]);
      setApiStatus("error");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getStatusColor = () => {
    switch (apiStatus) {
      case "ready": return "bg-green-500";
      case "loading": return "bg-yellow-500";
      case "error": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusText = () => {
    switch (apiStatus) {
      case "ready": return "Sẵn sàng";
      case "loading": return "Đang kết nối...";
      case "error": return "Lỗi kết nối";
      default: return "Không xác định";
    }
  };

  return (
    <>
      {/* Overlay: click ra ngoài để tắt */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 sm:bg-transparent"
          onClick={() => setIsOpen(false)}
        />
      )}
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-3 right-3 sm:bottom-6 sm:right-6 flex items-center gap-2 z-50 group"
          aria-label="Mở chatbot"
        >
          <span className="w-16 h-16 sm:w-14 sm:h-14 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-pink-200 active:scale-95">
            <MaterialIcon icon="smart_toy" className="text-3xl sm:text-xl animate-pulse" />
          </span>
          <span className="hidden sm:inline-block bg-white/90 text-pink-600 font-semibold px-4 py-2 rounded-xl shadow-md text-base ml-2 group-hover:bg-white group-hover:text-pink-700 transition-all select-none">
            Chat với AI
          </span>
        </button>
      )}
      {/* Chat Window */}
      {isOpen && (
        <div
          className="fixed bottom-0 left-0 right-0 sm:left-auto sm:right-6 sm:bottom-6 w-full sm:w-[420px] max-w-full sm:max-w-[500px] h-[80dvh] sm:h-[600px] bg-white/95 backdrop-blur-lg border border-white/40 shadow-2xl z-50 flex flex-col rounded-t-3xl sm:rounded-lg animate-slide-up"
          style={{ maxHeight: '95dvh' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white rounded-t-3xl sm:rounded-t-lg shadow-md select-none">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white/80 rounded-full flex items-center justify-center border-2 border-pink-400 shadow-lg animate-glow">
                <Image src="/logo.png" alt="Solace AI Logo" width={36} height={36} className="w-9 h-9 object-contain rounded-full" priority />
              </div>
              <div>
                <h3 className="font-bold text-lg sm:text-xl tracking-wide drop-shadow">Solace AI</h3>
                <div className="flex items-center space-x-2">
                  <p className="text-xs sm:text-sm text-pink-100">Google Gemini</p>
                  <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
                  <span className="text-xs sm:text-sm text-pink-100">{getStatusText()}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-pink-100 hover:text-white p-3 rounded-full focus:outline-none focus:ring-2 focus:ring-white active:scale-95"
            >
              <MaterialIcon icon="close" className="text-xl" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-2 sm:p-5 space-y-3 sm:space-y-5 bg-gradient-to-br from-white/95 via-indigo-50 to-pink-50 scrollbar-thin scrollbar-thumb-pink-200 scrollbar-track-white/30 text-[15px] sm:text-[16px] leading-relaxed"
            style={{ WebkitOverflowScrolling: 'touch' }}>
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.from === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[95vw] sm:max-w-[85%] rounded-2xl px-4 py-2 sm:px-5 sm:py-3 shadow-md border transition-all duration-200 ${
                    message.from === "user"
                      ? "bg-gradient-to-tr from-indigo-500 to-pink-400 text-white border-indigo-200"
                      : message.isError
                      ? "bg-red-100 text-red-800 border border-red-200"
                      : "bg-white/95 text-gray-800 border-pink-100"
                  }`}
                >
                  <p className="text-base whitespace-pre-line break-words leading-relaxed">{message.text}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className={`text-xs ${
                      message.from === "user" ? "text-indigo-100" : "text-gray-500"
                    }`}>
                      {formatTime(message.timestamp)}
                    </p>
                    {message.isError && (
                      <MaterialIcon icon="error" className="text-red-500 text-xs" />
                    )}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/95 text-gray-800 rounded-2xl px-4 py-2 sm:px-5 sm:py-3 border border-pink-100 shadow-md flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                    <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                  </div>
                  <span className="text-xs text-pink-500 animate-pulse">AI đang suy nghĩ...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-2 sm:p-5 border-t border-pink-200 bg-white/95 backdrop-blur-lg rounded-b-3xl sm:rounded-b-lg">
            <div className="flex space-x-2 sm:space-x-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={apiStatus === "error" ? "API lỗi - thử lại sau..." : "Nhập tin nhắn..."}
                className="flex-1 px-4 py-3 sm:px-5 sm:py-3 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent text-[15px] sm:text-[16px] bg-white/95"
                disabled={loading || apiStatus === "error"}
                autoFocus={isOpen && typeof window !== 'undefined' && window.innerWidth > 640}
                style={{ boxShadow: '0 2px 8px 0 rgba(236,72,153,0.07)' }}
                inputMode="text"
                autoComplete="on"
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim() || apiStatus === "error"}
                className="px-5 py-3 sm:px-6 sm:py-3 bg-gradient-to-tr from-pink-500 to-indigo-500 text-white rounded-xl hover:from-pink-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-base sm:text-base shadow-lg flex items-center justify-center active:scale-95"
                style={{ minWidth: 48 }}
              >
                {loading ? (
                  <span className="animate-spin mr-1"><MaterialIcon icon="autorenew" /></span>
                ) : (
                  <MaterialIcon icon="send" />
                )}
              </button>
            </div>

            {/* API Status Info */}
            {apiStatus === "error" && (
              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-700">
                  <MaterialIcon icon="info" className="inline mr-1" />
                  API Gemini không khả dụng. Vui lòng kiểm tra API key hoặc thử lại sau.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;