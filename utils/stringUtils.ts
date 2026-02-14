
/**
 * Cleans up transcription artifacts such as:
 * - Spaces before punctuation (e.g., "Hello ." -> "Hello.")
 * - Multiple consecutive spaces
 * - Common fragmentation patterns (e.g., "interes ted" -> "interested")
 * - Missing spaces between tokens (handled by InterviewSession)
 */
export function cleanTranscriptionText(text: string): string {
  if (!text) return "";
  
  let cleaned = text
    // Remove spaces before common punctuation marks
    .replace(/\s+([,.!?;:])/g, '$1')
    // Collapse multiple spaces into one
    .replace(/\s\s+/g, ' ');

  // Comprehensive list of fragments and suffixes often split by ASR
  const suffixes = [
    'ing', 'ly', 'lly', 'ed', 'ted', 'ment', 'tion', 'sion', 'ally', 'able', 'ive', 'ize', 'ise', 'full',
    'ness', 'less', 'ship', 'hood', 'ity', 'al', 'ous', 'en', 'er', 'est', 'ty', 'lls', 'te', 'my', 'ate'
  ];

  const prefixes = [
    'pre', 'inter', 'intra', 'sub', 'un', 'in', 'im', 'ir', 'il', 'dis', 'mis', 're', 'de', 'con', 'pro', 'ex', 'per',
    'wa', 'op', 'abi', 'bili', 'ana', 'tomy', 'comp', 'lete', 'cate', 'lo', 'spe', 'cial'
  ];

  // 1. Join Suffixes (word [space] suffix)
  suffixes.forEach(suffix => {
    const suffixRegex = new RegExp(`(\\w+)\\s(${suffix})\\b`, 'gi');
    cleaned = cleaned.replace(suffixRegex, '$1$2');
  });

  // 2. Join Prefixes (prefix [space] word)
  prefixes.forEach(prefix => {
    const prefixRegex = new RegExp(`\\b(${prefix})\\s(\\w+)`, 'gi');
    cleaned = cleaned.replace(prefixRegex, '$1$2');
  });

  // 3. Protection for common short words (DO NOT JOIN THESE)
  // We use a negative lookahead/lookbehind approach in a final heuristic
  const commonWords = [
    'a', 'an', 'am', 'i', 'in', 'is', 'it', 'if', 'of', 'on', 'my', 'by', 'as', 'at', 
    'to', 'be', 'do', 'so', 'we', 'he', 'me', 'up', 'no', 'the', 'and', 'but', 'for'
  ];

  // Final heuristic: Join 1-2 letter chunks that are NOT in our common words list
  // and are followed by a word (e.g., "op portunity")
  cleaned = cleaned.replace(/\b(\w{1,2})\s(\w+)\b/g, (match, p1, p2) => {
    const lowerP1 = p1.toLowerCase();
    // If it's a known short word, keep the space
    if (commonWords.includes(lowerP1)) return match;
    // If p2 is also very short, it's probably two separate small words (e.g., "it is")
    if (p2.length <= 2 && commonWords.includes(p2.toLowerCase())) return match;
    // Otherwise, it's likely a split word (e.g., "wa s" -> "was")
    return p1 + p2;
  });

  // Specific hard-coded joins for very common speech artifacts
  cleaned = cleaned.replace(/\b(mo|ski|pla|ga|bo|dy)\s(st|lls|ying|me|dy)\b/gi, '$1$2');
  cleaned = cleaned.replace(/\b(i)\s('m)\b/gi, "$1$2"); // I 'm -> I'm
  cleaned = cleaned.replace(/\b(\w+)\s('s|'t|'re|'ve|'ll|'d)\b/gi, "$1$2"); // join contractions

  return cleaned.trim();
}
