// Stopwords collection for Sift Entity Intelligence (Azerbaijani, Russian, English)

// 1. Azerbaijani Stopwords Set
const AZ_STOPWORDS = new Set([
  'və', 've', 'üçün', 'ilə', 'ile', 'bu', 'bir', 'daha', 'ki', 'həm', 'həmçinin', 'belə', 'o', 'ya', 'da', 
  'ən', 'çox', 'sonra', 'isə', 'biz', 'siz', 'onlar', 'amma', 'ancaq', 'lakin', 'bəzi', 'bütün', 
  'hər', 'heç', 'nə', 'bəli', 'xeyr', 'çünki', 'buna', 'bunun', 'üzrə', 'qarşı', 'görə', 
  'tərəfindən', 'aid', 'kimi', 'olaraq', 'olan', 'olub', 'olunub', 'olacaq', 'etmək', 'edib', 
  'edən', 'edərək', 'edir', 'verdi', 'verib', 'dedi', 'artıq', 'yeni', 'bir çox', 'daxil', 
  'eyni', 'öz', 'bununla', 'bəli', 'beləliklə', 'həmin', 'onun', 'onları', 'ondan', 'onda',
  'mənim', 'sənin', 'bizim', 'sizin', 'özü', 'özünü', 'özünə', 'altında', 'üstündə', 'arasında',
  'kənar', 'başqa', 'digər', 'dək', 'kimi', 'təki', 'sarı', 'doğru', 'tərəf', 'qarşı', 'qədər',
  
  // Common Azerbaijani news filler terms (noisy keywords)
  'xəbər', 'xəbərlər', 'məlumat', 'bildirib', 'qeyd', 'deyib', 'şəkil', 'foto', 'video', 
  'sayt', 'saytı', 'istinadən', 'istinad', 'saytına', 'saytında', 'əsasən', 'yaxın', 'gün', 
  'günü', 'illik', 'illər', 'ilində', 'ayında', 'aylar', 'saat', 'dən', 'dan', 'dək', 'il', 'ildə',
  'olan', 'olar', 'üzrə', 'haqqında', 'barədə', 'mövzu', 'olan', 'manat', 'faiz', 'min', 'milyon'
]);

// 2. Russian Stopwords Set
const RU_STOPWORDS = new Set([
  'и', 'в', 'на', 'что', 'с', 'по', 'как', 'к', 'у', 'за', 'о', 'для', 'из', 'от', 'но', 'а', 
  'то', 'же', 'бы', 'так', 'все', 'это', 'его', 'ее', 'их', 'мы', 'вы', 'они', 'он', 'она', 
  'оно', 'кто', 'что', 'этот', 'эта', 'это', 'эти', 'мне', 'тебе', 'себе', 'очень', 'уже', 
  'был', 'была', 'было', 'были', 'есть', 'нет', 'если', 'или', 'также', 'только', 'еще', 
  'более', 'после', 'время', 'один', 'два', 'три', 'когда', 'со', 'без', 'через', 'при', 
  'перед', 'над', 'под', 'об', 'обо', 'до', 'для', 'около', 'вокруг', 'между', 'ради', 
  'вследствие', 'благодаря', 'вопреки', 'несмотря', 'хотя', 'чтобы', 'потому', 'поэтому',
  
  // Common Russian news fillers
  'новость', 'новости', 'информация', 'сообщил', 'заявил', 'отметил', 'сказал', 'фото', 
  'видео', 'сайт', 'ссылке', 'года', 'году', 'время', 'день', 'месяц', 'часов', 'ранее'
]);

// 3. English Stopwords Set
const EN_STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'yet', 'of', 'to', 'in', 'for', 'on', 'by', 'at', 'with', 'from', 'as', 'about', 
  'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 
  'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 
  'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 
  'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 
  'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now', 'i', 'me', 'my', 
  'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves',
  'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 
  'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 
  'that', 'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 
  'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'because', 'until', 'while', 'of', 
  'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during',
  
  // Common English news fillers
  'news', 'information', 'reported', 'said', 'stated', 'noted', 'photo', 'video', 'website',
  'year', 'years', 'month', 'months', 'day', 'days', 'hour', 'hours', 'time', 'date', 'today'
]);

/**
 * Checks if a given token is a stopword or noisy term in any supported language
 */
export function isStopword(token: string): boolean {
  const normalized = token.trim().toLowerCase();
  
  // Filter out empty spaces, single characters, or numbers
  if (normalized.length <= 2) return true;
  if (/^\d+$/.test(normalized)) return true;

  // Perform Set lookups
  return (
    AZ_STOPWORDS.has(normalized) ||
    RU_STOPWORDS.has(normalized) ||
    EN_STOPWORDS.has(normalized)
  );
}
