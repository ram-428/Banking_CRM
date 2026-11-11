function escapeText(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/[^\x20-\x7e]/g, "?");
}

function hash(text: string) {
  let value = 7;
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) % 1_000_003;
  return value;
}

/** Builds a one-page sample PDF for a document, filled with the customer's name. */
export function sampleDocumentPdf(input: { title: string; code: string; holder: string; status: string }): Blob {
  const seed = hash(`${input.code}|${input.holder}`);
  const day = (offset: number) => String(((seed + offset) % 28) + 1).padStart(2, "0");
  const lines = [
    `Document: ${input.title}`,
    `Reference: ${input.code.replace("DOC-", "")}-${String(1000 + (seed % 9000))}`,
    "Issued by: Sample Authority, UAE",
    `Issue date: 2025-01-${day(3)}`,
    `Valid until: 2027-01-${day(11)}`,
    `Holder: ${input.holder}`,
    `Status: ${input.status} (sample)`,
  ];
  const content: string[] = [
    "0.19 0.31 0.65 rg 0 742 612 50 re f",
    `BT /F2 20 Tf 1 1 1 rg 48 758 Td (${escapeText(input.title)}) Tj ET`,
    "BT /F1 11 Tf 0.4 0.4 0.45 rg 48 700 Td (SAMPLE DOCUMENT - FOR DEMONSTRATION ONLY) Tj ET",
  ];
  let y = 666;
  for (const line of lines) {
    content.push(`BT /F1 12 Tf 0.1 0.1 0.15 rg 48 ${y} Td (${escapeText(line)}) Tj ET`);
    y -= 22;
  }
  y -= 10;
  for (const width of [500, 470, 500, 380, 490, 300]) {
    content.push(`0.88 0.89 0.93 rg 48 ${y} ${width} 8 re f`);
    y -= 20;
  }
  content.push("BT /F2 60 Tf 0.93 0.94 0.97 rg 1 0 0.55 1 130 300 Tm (SAMPLE) Tj ET");
  const stream = content.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(out.length);
    out += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) out += `${String(offset).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([out], { type: "application/pdf" });
}
