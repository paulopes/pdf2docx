# pdf2docx

A command-line tool that converts PDF files to DOCX format. It extracts text from PDF pages and produces Word documents with preserved paragraph structure and headings, but formatting and indentations are not preserved.

> **Note:** This tool extracts embedded text layers from PDFs. It does not perform OCR, so scanned image-only PDFs will produce empty pages.

## Installation

```bash
# Clone the project repository
git clone https://github.com/paulopes/pdf2docx.git

# Navigate to the project directory
cd pdf2docx

# Install dependencies
npm install

# Convert the typescript code to javascript
npm run build

# Link the command globally so you can run `pdf2docx` from anywhere
npm link
```

After running `npm link`, the `pdf2docx` command is available system-wide. To remove it later, run `npm unlink -g pdf2docx`.

You can also run it without installing globally:

```bash
node dist/cli.js <input>
```

## Usage

```bash
# Convert a single PDF (produces input.docx alongside it)
pdf2docx input.pdf

# Specify an output filename
pdf2docx input.pdf -o result.docx

# Convert specific pages (0-indexed)
pdf2docx input.pdf -p 0-2
pdf2docx input.pdf -p 0,3,5

# Batch convert multiple files
pdf2docx file1.pdf file2.pdf file3.pdf

# Convert all PDFs in a directory
pdf2docx docs/

# Recursively convert PDFs in nested folders
pdf2docx docs/ -r

# Send output files to a specific directory
pdf2docx docs/ -d output/
```

## Options

| Flag | Description |
|------|-------------|
| `-o, --output <file>` | Output filename (single input only) |
| `-d, --output-dir <dir>` | Directory for output files |
| `-p, --pages <range>` | Page range, e.g. `0-2` or `0,3,5` (0-indexed) |
| `-r, --recursive` | Recurse into subdirectories |

## License

This project is licensed under the [Apache License 2.0](LICENSE).
