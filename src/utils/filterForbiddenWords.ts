export function filterForbiddenWords(text: string, forbiddenWords: string[]): string {
  let result = text;
  forbiddenWords.forEach(word => {
    if (!word) return;
    // Thay thế tất cả các chuỗi con khớp với từ cấm, không cần \b
    const regex = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    result = result.replace(regex, '***');
  });
  return result;
}

export function getForbiddenWordsInText(text: string, forbiddenWords: string[]): string[] {
  const lowerText = text.toLowerCase();
  return forbiddenWords.filter(word => lowerText.includes(word.toLowerCase()));
}