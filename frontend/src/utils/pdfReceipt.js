import jsPDF from "jspdf";

/**
 * Builds and downloads a PDF "receipt" of a symptom-check result.
 * Runs entirely in the browser - no backend call involved.
 */
export function downloadSymptomReceipt({ result, symptoms = [], contextLine, patientName }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;
  let y = 56;

  const skyBlue = [14, 165, 233];
  const deepBlue = [37, 99, 235];
  const ink = [15, 41, 66];
  const muted = [91, 122, 153];

  const addSpace = (n = 14) => (y += n);
  const ensureRoom = (needed) => {
    if (y + needed > doc.internal.pageSize.getHeight() - 48) {
      doc.addPage();
      y = 56;
    }
  };

  // Header
  doc.setFillColor(...skyBlue);
  doc.circle(margin + 9, y - 6, 9, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...ink);
  doc.text("MediScan", margin + 26, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...muted);
  doc.text("AI Symptom Check Receipt", margin + 26, y + 13);

  doc.setFontSize(9);
  doc.setTextColor(...muted);
  const generatedAt = new Date().toLocaleString();
  doc.text(generatedAt, pageWidth - margin, y - 6, { align: "right" });

  addSpace(30);
  doc.setDrawColor(211, 231, 247);
  doc.line(margin, y, pageWidth - margin, y);
  addSpace(24);

  if (patientName) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...ink);
    doc.text(`Patient: ${patientName}`, margin, y);
    addSpace(20);
  }

  // Symptoms checked
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...ink);
  doc.text("Symptoms Checked", margin, y);
  addSpace(16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...muted);
  const symptomLines = doc.splitTextToSize(symptoms.join(", ") || "-", pageWidth - margin * 2);
  doc.text(symptomLines, margin, y);
  addSpace(symptomLines.length * 13 + 4);

  if (contextLine) {
    doc.text(contextLine, margin, y);
    addSpace(18);
  } else {
    addSpace(6);
  }

  // Possible causes
  const causes = result.possible_causes?.length
    ? result.possible_causes
    : [{ condition: result.condition, confidence: result.confidence, why: "" }];

  ensureRoom(30 + causes.length * 34);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...ink);
  doc.text("Possible Causes", margin, y);
  addSpace(18);

  causes.forEach((c, i) => {
    ensureRoom(34);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...(i === 0 ? deepBlue : ink));
    doc.text(`${i + 1}. ${c.condition}`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...muted);
    doc.text(`${Math.round(c.confidence)}% match`, pageWidth - margin, y, { align: "right" });
    addSpace(14);
    if (c.why) {
      doc.setFontSize(9.5);
      const whyLines = doc.splitTextToSize(c.why, pageWidth - margin * 2);
      doc.text(whyLines, margin, y);
      addSpace(whyLines.length * 12 + 8);
    } else {
      addSpace(8);
    }
  });

  const renderList = (title, items) => {
    if (!items?.length) return;
    ensureRoom(24 + items.length * 14);
    addSpace(6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...ink);
    doc.text(title, margin, y);
    addSpace(16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...muted);
    items.forEach((item) => {
      const lines = doc.splitTextToSize(`•  ${item}`, pageWidth - margin * 2);
      ensureRoom(lines.length * 13);
      doc.text(lines, margin, y);
      addSpace(lines.length * 13 + 2);
    });
  };

  renderList("Recommendations", result.recommendations);
  renderList("Treatment & Solutions", result.treatment);

  // Disclaimer
  ensureRoom(40);
  addSpace(10);
  doc.setDrawColor(211, 231, 247);
  doc.line(margin, y, pageWidth - margin, y);
  addSpace(16);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(...muted);
  const disclaimerLines = doc.splitTextToSize(
    result.disclaimer || "This is not a medical diagnosis. Please consult a doctor.",
    pageWidth - margin * 2
  );
  doc.text(disclaimerLines, margin, y);
  addSpace(disclaimerLines.length * 11 + 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...muted);
  doc.text("Generated locally by MediScan using a private, on-device AI model.", margin, y);

  const fileSafeCondition = (causes[0]?.condition || "symptom-check").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  doc.save(`mediscan-receipt-${fileSafeCondition}.pdf`);
}
