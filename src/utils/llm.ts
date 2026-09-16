export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const DEEPSEEK_API = 'https://api.deepseek.com/chat/completions';

export function getApiKey(): string {
  return localStorage.getItem('deepseek_api_key') || '';
}

export function saveApiKey(key: string): void {
  localStorage.setItem('deepseek_api_key', key.trim());
}

export async function analyzeSpelling(
  correctWord: string,
  userInput: string
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('请先在首页设置 DeepSeek API Key');
  }

  const prompt = `你是一个英语拼写老师。学生听到/看到单词后尝试拼写，但拼错了。

正确单词: "${correctWord}"
学生的错误拼写: "${userInput}"

请用中文给出简洁分析（150字以内，分点列明）：

1. **拆解**：这个单词可以拆成哪些音节（如 aban-don），每个音节怎么读
2. **错误分析**：学生错在哪里（哪个音节/字母）
3. **记忆技巧**：给1-2个实用的记忆方法（联想、词根词缀、发音规律等）`;

  const response = await fetch(DEEPSEEK_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 400,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error((err as { message?: string }).message || `API error ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export async function chatAboutWord(
  correctWord: string,
  phonetic: string,
  chinese: string,
  initialAnalysis: string,
  history: ChatMessage[],
  newMessage: string
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('请先在首页设置 DeepSeek API Key');
  }

  const systemPrompt = `你是一个友好的英语学习助手，正在帮学生理解单词"${correctWord}"（音标: ${phonetic}，中文: ${chinese}）。

之前你给过这个分析:
${initialAnalysis}

规则：
- 用口语化的中文回答，像朋友聊天一样，不要教科书腔
- 严格控制在2-4句话以内，不要展开
- 只回答学生问的具体问题，不要发散
- 如果学生问区别/对比，直接给最核心的1-2个点即可`;

  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: newMessage },
  ];

  const response = await fetch(DEEPSEEK_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      max_tokens: 250,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error((err as { message?: string }).message || `API error ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
