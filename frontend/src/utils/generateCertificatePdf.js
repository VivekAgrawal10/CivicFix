import { jsPDF } from 'jspdf';

export function generateResolutionCertificate(report) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;

  // Colors
  const navy = [36, 68, 92]; // #24445C
  const green = [110, 155, 138]; // #6E9B8A
  const darkText = [38, 55, 70]; // #263746
  const mutedText = [100, 120, 135];
  const borderGrey = [220, 232, 239]; // #DCE8EF
  const lightBg = [245, 248, 250]; // #F5F8FA

  // 1. Decorative Outer Border
  doc.setDrawColor(...borderGrey);
  doc.setLineWidth(0.8);
  doc.rect(margin, margin, contentWidth, pageHeight - margin * 2);

  // Inner subtle border
  doc.setDrawColor(...navy);
  doc.setLineWidth(0.3);
  doc.rect(margin + 2, margin + 2, contentWidth - 4, pageHeight - margin * 2 - 4);

  // 2. Header Top Banner
  doc.setFillColor(...navy);
  doc.rect(margin + 2, margin + 2, contentWidth - 4, 28, 'F');

  // Brand Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('CIVICFIX', margin + 8, margin + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('CIVIC ISSUE RESOLUTION PLATFORM  |  COMMUNITY REPORT RECORD', margin + 8, margin + 20);

  // Certificate Label on top right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('RECORD ID: ' + (report.id || 'N/A'), pageWidth - margin - 8, margin + 14, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Date: ' + new Date().toISOString().split('T')[0], pageWidth - margin - 8, margin + 20, { align: 'right' });

  // 3. Document Title
  let y = margin + 38;
  doc.setTextColor(...navy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('OFFICIAL ISSUE RESOLUTION RECORD', pageWidth / 2, y, { align: 'center' });

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...mutedText);
  doc.text('CivicFix Verified Maintenance and Citizen Quorum Audit', pageWidth / 2, y, { align: 'center' });

  // Divider line
  y += 6;
  doc.setDrawColor(...green);
  doc.setLineWidth(0.8);
  doc.line(margin + 12, y, pageWidth - margin - 12, y);

  // 4. Report Details Section
  y += 10;
  doc.setFillColor(...lightBg);
  doc.roundedRect(margin + 6, y, contentWidth - 12, 54, 2, 2, 'F');
  doc.setDrawColor(...borderGrey);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin + 6, y, contentWidth - 12, 54, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...navy);
  doc.text('1. REPORT SPECIFICATION', margin + 10, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...darkText);

  const col1X = margin + 10;
  const col2X = margin + 95;
  let rowY = y + 17;

  // Row 1
  doc.setFont('helvetica', 'bold');
  doc.text('Complaint ID:', col1X, rowY);
  doc.setFont('helvetica', 'normal');
  doc.text(String(report.id || 'N/A'), col1X + 30, rowY);

  doc.setFont('helvetica', 'bold');
  doc.text('Category:', col2X, rowY);
  doc.setFont('helvetica', 'normal');
  doc.text(String(report.category || 'Road Hazard'), col2X + 30, rowY);

  // Row 2
  rowY += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Location:', col1X, rowY);
  doc.setFont('helvetica', 'normal');
  doc.text(String(report.roadName || 'Public Roadway'), col1X + 30, rowY);

  doc.setFont('helvetica', 'bold');
  doc.text('Date Submitted:', col2X, rowY);
  doc.setFont('helvetica', 'normal');
  const submittedDate = report.timestamp ? report.timestamp.split('T')[0] : '2026-11-10';
  doc.text(submittedDate, col2X + 30, rowY);

  // Row 3
  rowY += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Reporter:', col1X, rowY);
  doc.setFont('helvetica', 'normal');
  doc.text(String(report.reporter || 'Verified Citizen'), col1X + 30, rowY);

  doc.setFont('helvetica', 'bold');
  doc.text('Date Resolved:', col2X, rowY);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date().toISOString().split('T')[0], col2X + 30, rowY);

  // Row 4 (Description)
  rowY += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Description:', col1X, rowY);
  doc.setFont('helvetica', 'normal');
  const desc = report.description || 'Reported street hazard resolved by maintenance team.';
  const splitDesc = doc.splitTextToSize(desc, contentWidth - 45);
  doc.text(splitDesc, col1X + 30, rowY);

  // 5. Complete Lifecycle Timeline
  y += 66;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...navy);
  doc.text('2. CHRONOLOGICAL RESOLUTION TIMELINE', margin + 10, y);

  y += 6;
  const timelineItems = [
    { title: 'Report Submitted', desc: 'Citizen photo and GPS coordinates logged into system.', status: 'Completed', date: submittedDate },
    { title: 'Report Reviewed', desc: 'Computer vision classification confirmed issue priority.', status: 'Completed', date: submittedDate },
    { title: 'Issue Verified', desc: 'Locality check passed; nearby reports grouped.', status: 'Completed', date: submittedDate },
    { title: 'Repair Assigned', desc: 'Work order dispatched to municipal road maintenance gang.', status: 'Completed', date: '2026-11-18' },
    { title: 'Repair Completed', desc: 'Surface leveled and cold asphalt patch applied.', status: 'Completed', date: new Date().toISOString().split('T')[0] },
    { title: 'Citizen Verification', desc: 'Local resident quorum confirmed road reopened and safe.', status: 'Verified', date: new Date().toISOString().split('T')[0] }
  ];

  timelineItems.forEach((item, index) => {
    const itemY = y + index * 12;

    // Timeline dot
    doc.setFillColor(...green);
    doc.circle(margin + 12, itemY + 2.5, 2, 'F');

    // Connecting line if not last
    if (index < timelineItems.length - 1) {
      doc.setDrawColor(...borderGrey);
      doc.setLineWidth(0.6);
      doc.line(margin + 12, itemY + 4.5, margin + 12, itemY + 12.5);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...navy);
    doc.text(item.title, margin + 18, itemY + 2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...mutedText);
    doc.text(item.desc, margin + 18, itemY + 5.5);

    // Status on right
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...green);
    doc.setFontSize(8);
    doc.text(item.status + ' (' + item.date + ')', pageWidth - margin - 12, itemY + 2, { align: 'right' });
  });

  // 6. Resolution Stamp & Sign-off Section
  y = pageHeight - margin - 46;
  doc.setDrawColor(...green);
  doc.setLineWidth(0.8);
  doc.line(margin + 12, y - 4, pageWidth - margin - 12, y - 4);

  // Stamp Box
  doc.setDrawColor(22, 163, 74); // Vibrant green
  doc.setFillColor(240, 253, 244);
  doc.setLineWidth(1.2);
  doc.roundedRect(margin + 10, y + 2, 48, 28, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(22, 163, 74);
  doc.text('RESOLVED', margin + 34, y + 13, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('CIVICFIX CONFIRMED', margin + 34, y + 19, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...mutedText);
  doc.text(report.id || 'INC-RECORD', margin + 34, y + 24, { align: 'center' });

  // Text next to stamp
  const stampTextX = margin + 65;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...navy);
  doc.text('Verification & Closeout Notice', stampTextX, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...darkText);
  doc.text('This issue has achieved citizen confirmation and completed physical remediation.', stampTextX, y + 11);
  doc.text('Road status has been refreshed to Normal across the CivicFix Live Map.', stampTextX, y + 15);

  // Required Disclaimer
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(...mutedText);
  doc.text('CivicFix Resolution Record - Demo', stampTextX, y + 21);
  doc.text('Government approval/endorsement: Not independently verified.', stampTextX, y + 25);

  // 7. Save and trigger download
  const filename = `CivicFix-Resolution-Certificate-${report.id || 'RECORD'}.pdf`;
  doc.save(filename);
}
