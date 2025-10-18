export interface MathPixConfig {
  appId: string;
  appKey: string;
  baseUrl?: string;
  maxPollingAttempts?: number;
  pollingInterval?: number;
}

export interface MathPixProcessingOptions {
  maxPollingTime?: number;
  formats?: MathPixFormat[];
}

export type MathPixFormat = "json" | "mmd" | "lines.json" | "tex.zip" | "docx";

export interface MathPixUploadResponse {
  pdf_id: string;
  status: "processing" | "completed" | "error";
  message?: string;
}

export interface MathPixPollResponse {
  pdf_id?: string;
  status: "processing" | "completed" | "error";
  version?: string;
  input_file?: string;
  num_pages?: number;
  num_pages_pdf?: number;
  num_pages_completed?: number;
  percent_done?: number;
  error?: string;
  message?: string;
}

export interface MathPixFormatResponse {
  content: any;
  format: MathPixFormat;
  contentType: string;
}

export interface MathPixProcessedResult {
  success: boolean;
  data?: MathPixPollResponse;
  formats?: Record<MathPixFormat, MathPixFormatResponse>;
  error?: string;
  processingTime?: number;
}

/**
 * MathPix OCR Service - Simplified version for NoteAhead
 */
class MathPixService {
  private static instance: MathPixService | null = null;

  private readonly config: Required<MathPixConfig>;
  private readonly headers: Record<string, string>;

  private constructor(config: MathPixConfig) {
    this.config = {
      appId: config.appId,
      appKey: config.appKey,
      baseUrl: config.baseUrl || "https://api.mathpix.com/v3/pdf",
      maxPollingAttempts: config.maxPollingAttempts || 60,
      pollingInterval: config.pollingInterval || 5000,
    };

    this.headers = {
      app_id: this.config.appId,
      app_key: this.config.appKey,
      "Content-Type": "application/json",
    };

    console.log("MathPixService initialized");
  }

  public static getInstance(config?: MathPixConfig): MathPixService {
    if (!MathPixService.instance) {
      if (!config) {
        throw new Error("MathPixService requires configuration for first initialization");
      }

      if (!config.appId || !config.appKey) {
        throw new Error("MathPixService requires appId and appKey");
      }

      MathPixService.instance = new MathPixService(config);
    }

    return MathPixService.instance;
  }

  private async uploadPdf(pdfBuffer: Buffer): Promise<MathPixUploadResponse> {
    const formData = new FormData();
    const pdfBlob = new Blob([pdfBuffer], { type: "application/pdf" });
    formData.append("file", pdfBlob, "document.pdf");

    const uploadHeaders = {
      app_id: this.config.appId,
      app_key: this.config.appKey,
    };

    console.log("Uploading PDF to MathPix...");
    const response = await fetch(this.config.baseUrl, {
      method: "POST",
      headers: uploadHeaders,
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `MathPix upload failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const result = (await response.json()) as MathPixUploadResponse;
    console.log("PDF uploaded successfully:", result.pdf_id);

    return result;
  }

  private async pollForResult(
    pdfId: string,
    options: MathPixProcessingOptions = {}
  ): Promise<MathPixPollResponse> {
    const startTime = Date.now();
    const maxPollingTime = options.maxPollingTime || 300000;
    let attempts = 0;

    console.log(`Starting to poll for PDF result: ${pdfId}`);

    while (attempts < this.config.maxPollingAttempts) {
      const currentTime = Date.now();

      if (currentTime - startTime > maxPollingTime) {
        throw new Error(`Polling timeout: exceeded ${maxPollingTime}ms`);
      }

      try {
        const response = await fetch(`${this.config.baseUrl}/${pdfId}`, {
          method: "GET",
          headers: this.headers,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `MathPix poll failed: ${response.status} ${response.statusText} - ${errorText}`
          );
        }

        const result = (await response.json()) as MathPixPollResponse;
        console.log(`Poll attempt ${attempts + 1}: Status = ${result.status}`);

        if (result.status === "completed") {
          console.log(`PDF processing completed`);
          return result;
        }

        if (result.status === "error") {
          throw new Error(
            `MathPix processing error: ${result.error || result.message || "Unknown error"}`
          );
        }

        await new Promise((resolve) => setTimeout(resolve, this.config.pollingInterval));
        attempts++;
      } catch (error) {
        console.error(`Poll attempt ${attempts + 1} failed:`, error);
        throw error;
      }
    }

    throw new Error(`Polling exceeded maximum attempts (${this.config.maxPollingAttempts})`);
  }

  private async getFormatResult(
    pdfId: string,
    format: MathPixFormat
  ): Promise<MathPixFormatResponse> {
    const formatExtension = format === "json" ? "" : `.${format}`;
    const url = `${this.config.baseUrl}/${pdfId}${formatExtension}`;

    console.log(`Retrieving ${format} format`);

    const response = await fetch(url, {
      method: "GET",
      headers: this.headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `MathPix format retrieval failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const contentType = response.headers.get("content-type") || "text/plain";
    let content;

    if (format === "lines.json") {
      content = await response.json();
    } else {
      content = await response.text();
    }

    return {
      content,
      format,
      contentType,
    };
  }

  private async getMultipleFormats(
    pdfId: string,
    formats: MathPixFormat[]
  ): Promise<Record<MathPixFormat, MathPixFormatResponse>> {
    const results: Record<MathPixFormat, MathPixFormatResponse> = {} as Record<
      MathPixFormat,
      MathPixFormatResponse
    >;

    for (const format of formats) {
      try {
        results[format] = await this.getFormatResult(pdfId, format);
        console.log(`Successfully retrieved ${format} format`);
      } catch (error) {
        console.warn(`Failed to retrieve ${format} format:`, error);
      }
    }

    return results;
  }

  public async processPdf(
    pdfBuffer: Buffer,
    options: MathPixProcessingOptions = {}
  ): Promise<MathPixProcessedResult> {
    const startTime = Date.now();

    try {
      console.log("Starting PDF processing with MathPix...");

      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error("Invalid PDF buffer provided");
      }

      const uploadResult = await this.uploadPdf(pdfBuffer);

      if (!uploadResult.pdf_id) {
        throw new Error("No PDF ID returned from upload");
      }

      const pollResult = await this.pollForResult(uploadResult.pdf_id, options);

      let formats: Record<MathPixFormat, MathPixFormatResponse> | undefined;
      if (options.formats && options.formats.length > 0) {
        console.log(`Retrieving additional formats: ${options.formats.join(", ")}`);
        formats = await this.getMultipleFormats(uploadResult.pdf_id, options.formats);
      }

      const processingTime = Date.now() - startTime;

      console.log("PDF processing completed successfully");

      return {
        success: true,
        data: pollResult,
        formats,
        processingTime,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      console.error("PDF processing failed:", errorMessage);

      return {
        success: false,
        error: errorMessage,
        processingTime,
      };
    }
  }
}

export const getMathPixService = (): MathPixService => {
  const appId = process.env.MATHPIX_APP_ID;
  const appKey = process.env.MATHPIX_API_KEY;

  if (!appId || !appKey) {
    throw new Error("MATHPIX_APP_ID and MATHPIX_API_KEY environment variables are required");
  }

  return MathPixService.getInstance({
    appId,
    appKey,
    baseUrl: process.env.MATHPIX_BASE_URL,
  });
};

export default MathPixService;

