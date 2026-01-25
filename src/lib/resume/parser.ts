import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';

// Configure pdfjs for Node.js environment
if (typeof window === 'undefined') {
    // Server-side: disable worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = '';
}

/**
 * Extracts text from a PDF buffer using pdfjs-dist
 */
export async function parsePdfText(buffer: Buffer): Promise<string> {
    try {
        // Uint8Array required for pdfjs
        const data = new Uint8Array(buffer);

        const loadingTask = pdfjsLib.getDocument({
            data,
            useWorkerFetch: false,
            isEvalSupported: false,
            useSystemFonts: true,
        });

        const pdfDocument = await loadingTask.promise;
        const numPages = pdfDocument.numPages;
        let fullText = "";

        for (let i = 1; i <= numPages; i++) {
            const page = await pdfDocument.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(" ");
            fullText += pageText + "\n";
        }

        return fullText.trim();
    } catch (error) {
        console.error("PDF Parse Error:", error);
        throw new Error("Failed to parse PDF text: " + (error as Error).message);
    }
}
