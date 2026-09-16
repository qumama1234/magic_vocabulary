import { useState } from 'react';
import { analyzeSpelling, chatAboutWord, ChatMessage } from '../utils/llm';

export function useAnalysis() {
  const [state, setState] = useState<{
    open: boolean;
    loading: boolean;
    content: string;
    error: string;
    word: string;
    input: string;
    phonetic: string;
    messages: ChatMessage[];
    chatLoading: boolean;
  }>({
    open: false,
    loading: false,
    content: '',
    error: '',
    word: '',
    input: '',
    phonetic: '',
    messages: [],
    chatLoading: false,
  });

  const startAnalysis = async (correctWord: string, userInput: string, phonetic: string) => {
    setState({
      open: true,
      loading: true,
      content: '',
      error: '',
      word: correctWord,
      input: userInput,
      phonetic,
      messages: [],
      chatLoading: false,
    });
    try {
      const result = await analyzeSpelling(correctWord, userInput);
      setState((s) => ({
        ...s,
        loading: false,
        content: result,
        messages: [{ role: 'assistant', content: result }],
      }));
    } catch (e) {
      setState((s) => ({
        ...s,
        loading: false,
        error: e instanceof Error ? e.message : '请求失败',
      }));
    }
  };

  const sendMessage = async (text: string) => {
    const { word, phonetic, content, messages } = state;
    const userMsg: ChatMessage = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setState((s) => ({ ...s, messages: newMessages, chatLoading: true }));
    try {
      const reply = await chatAboutWord(word, phonetic, '', content, messages, text);
      setState((s) => ({
        ...s,
        chatLoading: false,
        messages: [...s.messages, { role: 'assistant', content: reply }],
      }));
    } catch (e) {
      setState((s) => ({
        ...s,
        chatLoading: false,
        messages: [
          ...s.messages,
          { role: 'assistant', content: `Error: ${e instanceof Error ? e.message : '请求失败'}` },
        ],
      }));
    }
  };

  const close = () => setState((s) => ({ ...s, open: false }));

  return { analysisState: state, startAnalysis, sendMessage, closeAnalysis: close };
}
