/**
 * Validates if a file is of an allowed type for upload
 * @param file - The file to validate
 * @returns Object with isValid boolean and errorMessage string
 */
export const validateFileType = (file: File): { isValid: boolean; errorMessage?: string } => {
  // Allowed MIME types
  const allowedMimeTypes = [
    'application/pdf',                    // PDF
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // PPTX
    'image/jpeg',                         // JPEG
    'image/png',                          // PNG
    'image/gif',                          // GIF
    'image/webp',                         // WebP
    'image/svg+xml',                      // SVG
    'image/bmp',                          // BMP
    'image/tiff',                         // TIFF
  ];

  // Allowed file extensions (as fallback for files with generic MIME types)
  const allowedExtensions = [
    '.pdf',
    '.docx',
    '.pptx',
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.webp',
    '.svg',
    '.bmp',
    '.tiff',
    '.tif',
  ];

  const fileName = file.name.toLowerCase();
  const fileExtension = fileName.substring(fileName.lastIndexOf('.'));

  // Check MIME type first
  if (allowedMimeTypes.includes(file.type)) {
    return { isValid: true };
  }

  // Check file extension as fallback
  if (allowedExtensions.includes(fileExtension)) {
    return { isValid: true };
  }

  // Generate error message with allowed types
  const allowedTypesText = "PDF, DOCX, PPTX, or image files (JPEG, PNG, GIF, WebP, SVG, BMP, TIFF)";
  
  return { 
    isValid: false, 
    errorMessage: `File type not allowed. Please upload ${allowedTypesText}.`
  };
};

/**
 * Get file extension from filename
 */
export const getFileExtension = (filename: string): string => {
  return filename.toLowerCase().substring(filename.lastIndexOf('.'));
};

/**
 * Process file name by removing extension and replacing spaces with underscores
 */
export const processFileName = (fileName: string): string => {
  const lastDotIndex = fileName.lastIndexOf(".");
  const value = lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
  // Replace all whitespace characters (spaces, tabs, non-breaking spaces, etc.) with underscores
  const result = value.replace(/\s+/g, "_");
  return result;
};

