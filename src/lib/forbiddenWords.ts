// Lấy danh sách từ cấm từ API backend
export async function fetchForbiddenWords(): Promise<string[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/forbidden_words`);
    const data = await res.json();
    if (data.success && Array.isArray(data.forbiddenWords)) {
      // Nếu API trả về mảng object, lấy trường word
      if (typeof data.forbiddenWords[0] === 'object') {
        return data.forbiddenWords.map((item: any) => item.word);
      }
      return data.forbiddenWords;
    }
    return [];
  } catch (e) {
    return [];
  }
}

// Hàm thay thế từ cấm bằng ***
export function filterForbiddenWords(text: string, forbiddenWords: string[]): string {
  if (!forbiddenWords || forbiddenWords.length === 0) return text;
  let result = text;
  forbiddenWords.forEach(word => {
    const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\b`, 'gi');
    result = result.replace(regex, '***');
  });
  return result;
}
