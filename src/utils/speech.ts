export async function speak(word: string): Promise<void> {
  // Try Youdao Dict Voice first — high quality TTS for English words
  try {
    await playYoudao(word);
  } catch {
    // Fall back to browser SpeechSynthesis on failure
    await playBrowserTTS(word);
  }
}

function playYoudao(word: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(
      `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=1`
    );
    let started = false;
    audio.onplaying = () => { started = true; };
    audio.onended = () => resolve();
    audio.onerror = () => {
      if (!started) reject(new Error('Youdao audio failed'));
      else resolve();
    };
    audio.play().catch(reject);
  });
}

function playBrowserTTS(word: string): Promise<void> {
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.rate = 0.9;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    speechSynthesis.speak(utterance);
  });
}

