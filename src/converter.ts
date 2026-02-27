import fs from "node:fs";
import path from "node:path";
// @ts-ignore — pdfjs-dist legacy build
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  PageBreak,
} from "docx";

export interface ConvertOptions {
  /** 0-indexed page numbers to include. `undefined` means all pages. */
  pages?: number[];
}

interface PdfPage {
  pageIndex: number;
  text: string;
}

/**
 * Extract text from a PDF using pdfjs-dist, optionally limited to specific 0-indexed pages.
 */
async function extractPages(
  pdfPath: string,
  pages?: number[]
): Promise<PdfPage[]> {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await getDocument({ data, verbosity: 0 }).promise;
  const totalPages = doc.numPages;

  const indices = pages ?? Array.from({ length: totalPages }, (_, i) => i);
  const extracted: PdfPage[] = [];

  for (const idx of indices) {
    const pageNum = idx + 1; // pdfjs uses 1-based
    if (pageNum < 1 || pageNum > totalPages) continue;

    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const text = content.items
      .map((item: any) => item.str as string)
      .join(" ")
      .trim();

    extracted.push({ pageIndex: idx, text });
  }

  doc.destroy();
  return extracted;
}

/**
 * Build Word paragraphs from extracted page text.
 */
function buildParagraphs(pages: PdfPage[]): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];

    // Split the page text into blocks by double-spaces (rough paragraph boundary)
    const blocks = page.text
      .split(/\n{2,}/)
      .map((b) => b.trim())
      .filter(Boolean);

    if (blocks.length === 0) {
      blocks.push(page.text || "(empty page)");
    }

    for (const block of blocks) {
      const isHeading =
        block.length < 80 &&
        !block.endsWith(".") &&
        block === block.toUpperCase() &&
        block.length > 1;

      if (isHeading) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: block, bold: true, size: 28 })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 120 },
          })
        );
      } else {
        const lines = block.split(/\n/).map((l) => l.trim());
        const runs: TextRun[] = [];
        for (let j = 0; j < lines.length; j++) {
          if (j > 0) runs.push(new TextRun({ break: 1, text: "" }));
          runs.push(new TextRun({ text: lines[j], size: 24 }));
        }
        paragraphs.push(
          new Paragraph({ children: runs, spacing: { after: 120 } })
        );
      }
    }

    // Page break between pages (except after the last)
    if (i < pages.length - 1) {
      paragraphs.push(new Paragraph({ children: [new PageBreak()] }));
    }
  }

  return paragraphs;
}

/**
 * Convert a PDF file to a DOCX file.
 */
export async function convertPdfToDocx(
  inputPath: string,
  outputPath: string,
  options: ConvertOptions = {}
): Promise<void> {
  const pages = await extractPages(inputPath, options.pages);

  if (pages.length === 0) {
    throw new Error("No pages extracted from the PDF.");
  }

  const paragraphs = buildParagraphs(pages);

  const doc = new Document({
    creator: "pdf-to-docx",
    description: `Converted from ${path.basename(inputPath)}`,
    sections: [{ properties: {}, children: paragraphs }],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
}
