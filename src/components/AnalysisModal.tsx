import { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../utils/llm';

export default function AnalysisModal({
  state,
  onClose,
  onSendMessage,
}: {
  state: {
    open: boolean;
    loading: boolean;
    content: string;
    error: string;
    word: string;
    input: string;
    phonetic: string;
    messages: ChatMessage[];
    chatLoading: boolean;
  };
  onClose: () => void;
  onSendMessage?: (text: string) => void;
}) {
  const [chatInput, setChatInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages]);

  if (!state.open) return null;

  const handleSend = () => {
    const text = chatInput.trim();
    if (!text || state.chatLoading || !onSendMessage) return;
    setChatInput('');
    onSendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasChat = state.messages.length > 0 || !state.loading;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>🧠 单词深入拆解</h3>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-word">
          <strong>{state.word}</strong>
          <span className="modal-phonetic">{state.phonetic}</span>
        </div>
        <div className="modal-body">
          {state.loading && (
            <div className="modal-loading">
              <span className="spinner" />
              <p>AI 正在分析中...</p>
            </div>
          )}
          {state.error && (
            <div className="modal-error">
              <p>{state.error}</p>
              {state.error.includes('API Key') && (
                <p className="modal-hint">请在首页底部设置 DeepSeek API Key</p>
              )}
            </div>
          )}
          {state.content && (
            <div className="modal-analysis">
              {state.content.split('\n').map((line, i) => {
                if (!line.trim()) return <br key={i} />;
                if (line.startsWith('###')) {
                  return <h4 key={i}>{line.replace(/^###\s*/, '')}</h4>;
                }
                return (
                  <p key={i} className="analysis-line">
                    {line}
                  </p>
                );
              })}
            </div>
          )}

          {/* Chat Section */}
          {hasChat && !state.error && (
            <div className="chat-section">
              <div className="chat-messages">
                {state.messages.slice(1).map((msg, i) => (
                  <div key={i} className={`chat-message ${msg.role}`}>
                    <div className="chat-bubble">{msg.content}</div>
                  </div>
                ))}
                {state.chatLoading && (
                  <div className="chat-message assistant">
                    <div className="chat-bubble chat-loading">
                      <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              {onSendMessage && (
                <div className="chat-input-row">
                  <input
                    className="chat-input"
                    placeholder="追问这个词的用法..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={state.chatLoading}
                  />
                  <button
                    className="chat-send-btn"
                    onClick={handleSend}
                    disabled={state.chatLoading || !chatInput.trim()}
                  >
                    发送
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
