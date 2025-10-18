declare module 'tus-js-client' {
  export class Upload {
    constructor(file: File, options: UploadOptions);
    start(): void;
    abort(): void;
    findPreviousUploads(): Promise<PreviousUpload[]>;
    resumeFromPreviousUpload(previousUpload: PreviousUpload): void;
  }

  export interface UploadOptions {
    endpoint: string;
    retryDelays?: number[];
    headers?: Record<string, string>;
    uploadDataDuringCreation?: boolean;
    removeFingerprintOnSuccess?: boolean;
    metadata?: Record<string, string>;
    chunkSize?: number;
    onError?: (error: Error) => void;
    onProgress?: (bytesUploaded: number, bytesTotal: number) => void;
    onSuccess?: () => void;
  }

  export interface PreviousUpload {
    uploadUrl: string;
  }
}

