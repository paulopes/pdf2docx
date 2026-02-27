#!/usr/bin/env node
/**
 * pdf-to-docx — Convert PDF files to DOCX from the command line.
 *
 * Usage:
 *   npx tsx src/cli.ts input.pdf                   # → input.docx
 *   npx tsx src/cli.ts input.pdf -o result.docx    # custom output
 *   npx tsx src/cli.ts input.pdf -p 0-2            # pages 0–2 only
 *   npx tsx src/cli.ts *.pdf                       # batch convert
 *   npx tsx src/cli.ts docs/ -r                    # recurse folders
 */

import fs from "node:fs";
import path from "node:path";
import { Command } from "commander";
import { glob } from "glob";
import { convertPdfToDocx, type ConvertOptions } from "./converter.js";

function parsePages(spec: string): number[] {
  const pages: number[] = [];
  for (const part of spec.split(",")) {
    if (part.includes("-")) {
      const [lo, hi] = part.split("-").map(Number);
      for (let i = lo; i <= hi; i++) pages.push(i);
    } else {
      pages.push(Number(part));
    }
  }
  return pages;
}

async function gatherPdfs(
  inputs: string[],
  recursive: boolean
): Promise<string[]> {
  const pdfs: string[] = [];

  for (const input of inputs) {
    const resolved = path.resolve(input);

    if (
      fs.existsSync(resolved) &&
      fs.statSync(resolved).isFile() &&
      resolved.toLowerCase().endsWith(".pdf")
    ) {
      pdfs.push(resolved);
    } else if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
      const pattern = recursive ? "**/*.pdf" : "*.pdf";
      const matches = await glob(pattern, { cwd: resolved, absolute: true });
      pdfs.push(...matches.sort());
    } else {
      // Try as a glob pattern
      const matches = await glob(input, { absolute: true });
      const pdfMatches = matches.filter((m) => m.toLowerCase().endsWith(".pdf"));
      if (pdfMatches.length > 0) {
        pdfs.push(...pdfMatches.sort());
      } else {
        console.warn(`  ⚠ skipping ${input} (not a PDF or directory)`);
      }
    }
  }

  return pdfs;
}

async function main() {
  const program = new Command();

  program
    .name("pdf2docx")
    .description("Convert PDF files to DOCX format")
    .argument("<inputs...>", "PDF file(s) or director(ies) to convert")
    .option("-o, --output <file>", "Output filename (single input only)")
    .option("-d, --output-dir <dir>", "Directory for output files")
    .option("-p, --pages <range>", "Page range, e.g. '0-2' or '0,3,5' (0-indexed)")
    .option("-r, --recursive", "Recurse into subdirectories", false)
    .action(async (inputs: string[], opts) => {
      const pdfs = await gatherPdfs(inputs, opts.recursive);

      if (pdfs.length === 0) {
        console.error("No PDF files found.");
        process.exit(1);
      }

      if (opts.output && pdfs.length > 1) {
        console.error("--output can only be used with a single input file.");
        process.exit(1);
      }

      const convertOpts: ConvertOptions = {};
      if (opts.pages) {
        convertOpts.pages = parsePages(opts.pages);
      }

      console.log(`Converting ${pdfs.length} file(s)…\n`);
      let errors = 0;

      for (const pdf of pdfs) {
        let dst: string;
        if (opts.output) {
          dst = path.resolve(opts.output);
        } else {
          const parent = opts.outputDir
            ? path.resolve(opts.outputDir)
            : path.dirname(pdf);
          dst = path.join(parent, path.basename(pdf, ".pdf") + ".docx");
        }

        // Ensure output directory exists
        const dstDir = path.dirname(dst);
        if (!fs.existsSync(dstDir)) {
          fs.mkdirSync(dstDir, { recursive: true });
        }

        try {
          await convertPdfToDocx(pdf, dst, convertOpts);
          console.log(`  ✓ ${path.relative(process.cwd(), pdf)} → ${path.relative(process.cwd(), dst)}`);
        } catch (err: any) {
          console.error(`  ✗ ${path.relative(process.cwd(), pdf)}: ${err.message}`);
          errors++;
        }
      }

      const total = pdfs.length;
      const ok = total - errors;
      console.log(`\nDone — ${ok}/${total} succeeded.`);
      if (errors) process.exit(1);
    });

  await program.parseAsync(process.argv);
}

main();
