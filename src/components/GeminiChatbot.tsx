"use client";

import React, { useState, useRef, useEffect } from "react";
import { MaterialIcon } from "./MaterialIcon";

interface Message {
  from: "user" | "bot";
  text: string;
  timestamp: Date;
  isError?: boolean;
}

const GeminiChatbot = () => {
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
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg z-50 flex items-center justify-center transition-all duration-200"
        aria-label="Mở chatbot"
      >
        {isOpen ? (
          <MaterialIcon icon="close" className="text-xl" />
        ) : (
          <MaterialIcon icon="smart_toy" className="text-xl" />
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-80 h-96 bg-white rounded-lg shadow-xl z-50 flex flex-col border border-gray-200">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-indigo-600 text-white rounded-t-lg">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <MaterialIcon icon="smart_toy" className="text-indigo-600 text-lg" />
              </div>
              <div>
                <h3 className="font-semibold">Solace AI</h3>
                <div className="flex items-center space-x-2">
                  <p className="text-xs text-indigo-100">Google Gemini</p>
                  <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
                  <span className="text-xs text-indigo-100">{getStatusText()}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-indigo-100 hover:text-white"
            >
              <MaterialIcon icon="close" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.from === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    message.from === "user"
                      ? "bg-indigo-600 text-white"
                      : message.isError
                      ? "bg-red-100 text-red-800 border border-red-200"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  <p className="text-sm whitespace-pre-line">{message.text}</p>
                  <div className="flex items-center justify-between mt-1">
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
                <div className="bg-gray-100 text-gray-800 rounded-lg px-3 py-2">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                    </div>
                    <span className="text-xs text-gray-500">AI đang suy nghĩ...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={apiStatus === "error" ? "API lỗi - thử lại sau..." : "Nhập tin nhắn..."}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                disabled={loading || apiStatus === "error"}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim() || apiStatus === "error"}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <MaterialIcon icon="send" />
              </button>
            </div>
            
            {/* API Status Info */}
            {apiStatus === "error" && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
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

export default GeminiChatbot; 