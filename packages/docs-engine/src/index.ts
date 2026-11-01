import { randomBytes } from 'node:crypto';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';

export type CertificateType = 'SALARY_CERTIFICATE' | 'SERVICE_CERTIFICATE' | 'NOC';

export interface CertificateInput {
  docType: CertificateType;
  employee: {
    empCode: string;
    name: string;
    grade?: string | null;
    designation?: string | null;
    unit?: string | null;
    payScale?: string | null;
    dateOfJoining?: string | null;
  };
  issuedBy?: string;
  /** Base URL the QR points at, e.g. http://localhost:3001 → /verify/<code>. */
  verifyBaseUrl: string;
}

export interface GeneratedCertificate {
  bytes: Uint8Array;
  verifyCode: string;
  title: string;
  summary: string;
}

const TITLES: Record<CertificateType, string> = {
  SALARY_CERTIFICATE: 'Salary Certificate',
  SERVICE_CERTIFICATE: 'Service Certificate',
  NOC: 'No-Objection Certificate',
};

function bodyText(input: CertificateInput): string[] {
  const e = input.employee;
  const common = `This is to certify that ${e.name} (Employee Code ${e.empCode}), ${
    e.designation ?? 'Officer'
  } in grade ${e.grade ?? '—'}, is a bona fide employee of Numaligarh Refinery Limited posted at ${
    e.unit ?? '—'
  }.`;
  switch (input.docType) {
    case 'SALARY_CERTIFICATE':
      return [common, `The employee is drawing pay in the scale ${e.payScale ?? '—'} (IDA pattern).`];
    case 'SERVICE_CERTIFICATE':
      return [common, `Date of joining: ${e.dateOfJoining?.slice(0, 10) ?? '—'}. Service is continuing.`];
    case 'NOC':
      return [common, 'The organisation has no objection to the purpose for which this certificate is sought.'];
  }
}

/**
 * Generate a certificate PDF with a QR verification code. The QR encodes the
 * public /verify/<code> URL; scanning it confirms authenticity against the
 * GeneratedDocument record.
 *
 * NOTE (Phase 1 slice): the PDF is not yet byte-encrypted. "Password protection"
 * and link expiry are enforced at the delivery layer (the download requires the
 * employee PIN / a short-lived signed link). Native PDF encryption is a
 * docs-engine hardening follow-up (qpdf).
 */
export async function generateCertificate(input: CertificateInput): Promise<GeneratedCertificate> {
  const verifyCode = randomBytes(6).toString('hex').toUpperCase();
  const title = TITLES[input.docType];
  const verifyUrl = `${input.verifyBaseUrl.replace(/\/$/, '')}/verify/${verifyCode}`;

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const teal = rgb(0.05, 0.49, 0.4);
  const ink = rgb(0.05, 0.17, 0.14);

  // Header band (placeholder mark — never NRL's real logo/branding).
  page.drawRectangle({ x: 0, y: 792, width: 595, height: 50, color: teal });
  page.drawText('Numaligarh Refinery Limited', { x: 40, y: 810, size: 16, font: bold, color: rgb(1, 1, 1) });
  page.drawText('Human Resources — Saathi HRMS', { x: 40, y: 796, size: 9, font, color: rgb(0.9, 0.97, 0.95) });

  page.drawText(title, { x: 40, y: 740, size: 20, font: bold, color: ink });
  page.drawLine({ start: { x: 40, y: 732 }, end: { x: 400, y: 732 }, thickness: 1, color: teal });

  let y = 700;
  for (const line of bodyText(input)) {
    for (const wrapped of wrap(line, 78)) {
      page.drawText(wrapped, { x: 40, y, size: 11, font, color: ink });
      y -= 18;
    }
    y -= 6;
  }

  page.drawText(`Issued by: ${input.issuedBy ?? 'HR Department'}`, { x: 40, y: y - 10, size: 10, font, color: ink });
  page.drawText(`Issued on: ${new Date().toISOString().slice(0, 10)}`, { x: 40, y: y - 26, size: 10, font, color: ink });

  // QR verification block.
  const qrPng = await QRCode.toBuffer(verifyUrl, { margin: 1, width: 120 });
  const qrImg = await pdf.embedPng(qrPng);
  page.drawImage(qrImg, { x: 430, y: 60, width: 110, height: 110 });
  page.drawText('Scan to verify', { x: 440, y: 48, size: 9, font, color: ink });
  page.drawText(`Verification code: ${verifyCode}`, { x: 40, y: 70, size: 9, font: bold, color: teal });
  page.drawText('Verify authenticity at the URL encoded in the QR code.', { x: 40, y: 56, size: 8, font, color: ink });

  const bytes = await pdf.save();
  const summary = `${title} for ${input.employee.name} (${input.employee.empCode}), issued ${new Date()
    .toISOString()
    .slice(0, 10)}.`;
  return { bytes, verifyCode, title, summary };
}

function wrap(text: string, cols: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > cols) {
      lines.push(line.trim());
      line = w;
    } else {
      line = `${line} ${w}`;
    }
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}
