export const preprocessLatex = (content: string): string => {
    // Escape all existing dollar signs to prevent LaTeX conflicts
    // This ensures only explicit LaTeX delimiters (\( \) \[ \]) are processed
    const escapedContent = content
      .replace(/\$/g, '\\$');

  // Now process LaTeX delimiters - these will be the ONLY math delimiters
  const processedContent = escapedContent
    .replace(/\\\(/g, "$")
    .replace(/\\\)/g, "$")
    .replace(/(\s*)\\\[([\s\S]*?)\\\](\s*)/g, (match, leadingWhitespace, mathContent) => {
      // Preserve the line structure and ensure proper spacing after math blocks
      // Add an extra newline after the closing ``` to ensure proper separation from following content
      return `\n\`\`\`math\n${mathContent.trim()}\n\`\`\`\n\n`;
    });

    return processedContent;
  };
  
  // Preprocess markdown content for better editor experience
export const preprocessMarkdownForPreview = (content: string): string => {
    // Convert single line breaks to hard line breaks while preserving multiple consecutive newlines
    // This gives a more WYSIWYG experience in the editor

    if (!content) return "";

    const processed = content
      // First, protect sequences of 2+ newlines by temporarily replacing them
      .replace(/\n{2,}/g, (match) => {
        return `___MULTI_NEWLINE_${match.length}___`;
      })
      // Convert remaining single line breaks to hard line breaks (two spaces + newline)
      .replace(/\n/g, '  \n')
      // Restore multiple newlines
      .replace(/___MULTI_NEWLINE_(\d+)___/g, (match, count) => {
        return '\n'.repeat(parseInt(count));
      })
    
    return processed;
  };

