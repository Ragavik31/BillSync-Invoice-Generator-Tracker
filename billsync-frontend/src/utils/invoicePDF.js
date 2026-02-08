import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const generateInvoicePDF = async (invoiceData) => {
  try {
    const pdf = new jsPDF();

    // Set document properties
    pdf.setProperties({
      title: `Invoice ${invoiceData.invoiceNumber}`,
      author: 'BillSync',
      keywords: 'invoice, billing',
      creator: 'BillSync Invoice System'
    });

    // Layout constants
    const marginLeft = 20;
    const pageWidth = 210;
    const pageHeight = 297;
    const contentRight = 190;
    const headerTop = 28;
    const sectionTop = 44;
    const tableHeaderY = sectionTop + 46;
    const rowHeight = 10;
    const rowsPerPage = 10; // requirement

    const drawPageFrame = () => {
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.8);
      pdf.rect(10, 10, pageWidth - 20, pageHeight - 20);
    };

    const drawHeader = () => {
      // Title
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(22);
      pdf.setTextColor(0, 0, 0);
      pdf.text('INVOICE', marginLeft, headerTop);

      // Invoice meta (right side)
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Invoice #:', 130, 22);
      pdf.text('Date:', 130, 28);
      pdf.text('Due Date:', 130, 34);
      pdf.setFont('helvetica', 'normal');
      pdf.text(String(invoiceData.invoiceNumber || ''), 165, 22);
      pdf.text(String(invoiceData.invoiceDate || ''), 165, 28);
      pdf.text(String(invoiceData.dueDate || ''), 165, 34);

      // Seller and Customer blocks
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text('Seller', marginLeft, sectionTop);
      pdf.text('Customer', 110, sectionTop);

      let seller = {};
      try { seller = JSON.parse(localStorage.getItem('companyData') || '{}'); } catch {}
      const sellerName = seller.name || 'Your Company';
      const sellerAddress = [seller.address, seller.city, seller.state, seller.zipCode].filter(Boolean).join(', ');
      const sellerPhone = seller.phone || '';
      const sellerEmail = seller.email || '';
      const sellerGST = seller.taxId || '';

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text(sellerName, marginLeft, sectionTop + 8);
      if (sellerAddress) pdf.text(sellerAddress, marginLeft, sectionTop + 14);
      if (sellerPhone) pdf.text(`Phone: ${sellerPhone}`, marginLeft, sectionTop + 20);
      if (sellerEmail) pdf.text(`Email: ${sellerEmail}`, marginLeft, sectionTop + 26);
      if (sellerGST) pdf.text(`GSTIN: ${sellerGST}`, marginLeft, sectionTop + 32);

      const custX = 110;
      const cust = {
        name: invoiceData.client,
        address: invoiceData.address,
        email: invoiceData.email,
        gstin: invoiceData.gstin || invoiceData.customer_gstin || '',
      };
      pdf.text(String(cust.name || ''), custX, sectionTop + 8);
      if (cust.address) {
        const addrLines = pdf.splitTextToSize(String(cust.address), 80);
        pdf.text(addrLines, custX, sectionTop + 14);
      }
      if (cust.email) pdf.text(`Email: ${cust.email}`, custX, sectionTop + 26);
      if (cust.gstin) pdf.text(`GSTIN: ${cust.gstin}`, custX, sectionTop + 32);

      // Items table header
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.4);
      pdf.text('Description', marginLeft, tableHeaderY - 3);
      pdf.text('Qty', 110, tableHeaderY - 3);
      pdf.text('Rate (₹)', 140, tableHeaderY - 3);
      pdf.text('Amount (₹)', 170, tableHeaderY - 3);
      // Header underline
      pdf.line(marginLeft, tableHeaderY, contentRight, tableHeaderY);
    };

    const drawPageNumber = (pageIndex, totalPages) => {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.text(`Page ${pageIndex} of ${totalPages}`, pageWidth / 2, pageHeight - 12, { align: 'center' });
    };

    // Chunk items into pages
    const items = Array.isArray(invoiceData.items) ? invoiceData.items : [];
    const pages = [];
    for (let i = 0; i < items.length; i += rowsPerPage) {
      pages.push(items.slice(i, i + rowsPerPage));
    }
    const totalPages = Math.max(1, pages.length);

    const grandSubtotal = items.reduce((sum, it) => sum + Number(it.amount || (Number(it.quantity || 0) * Number(it.rate || 0)) || 0), 0);
    const grandTax = grandSubtotal * 0.08;
    const grandTotal = grandSubtotal + grandTax;

    if (totalPages === 0) pages.push([]); // ensure at least one page

    pages.forEach((pageItems, idx) => {
      if (idx > 0) pdf.addPage();
      drawPageFrame();
      drawHeader();

      // Draw rows with outline boxes
      let y = tableHeaderY + 6;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setDrawColor(160, 160, 160);
      pdf.setLineWidth(0.2);

      const pageSubtotal = pageItems.reduce((sum, it) => sum + Number((it.amount != null ? it.amount : (Number(it.quantity || 0) * Number(it.rate || 0))) || 0), 0);
      const pageTax = pageSubtotal * 0.08;
      const pageTotal = pageSubtotal + pageTax;

      pageItems.forEach((item) => {
        // Row box
        pdf.rect(marginLeft - 2, y - 6, contentRight - marginLeft + 2, rowHeight, 'S');
        // Texts
        pdf.text(String(item.description || ''), marginLeft, y);
        pdf.text(String(item.quantity || 0), 110, y);
        pdf.text(`₹${Number(item.rate || 0).toFixed(2)}`, 140, y);
        const amt = (item.amount != null ? Number(item.amount) : (Number(item.quantity || 0) * Number(item.rate || 0)));
        pdf.text(`₹${Number(amt).toFixed(2)}`, 170, y);
        y += rowHeight;
      });

      // Per-page totals box
      y += 6;
      const boxX = 120;
      const boxW = 70;
      const boxH = 24;
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.3);
      pdf.rect(boxX, y - 14, boxW, boxH, 'S');
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      pdf.text('Page Subtotal:', boxX + 4, y - 10);
      pdf.text(`₹${pageSubtotal.toFixed(2)}`, boxX + boxW - 4, y - 10, { align: 'right' });
      pdf.text('Page Tax (8%):', boxX + 4, y - 4);
      pdf.text(`₹${pageTax.toFixed(2)}`, boxX + boxW - 4, y - 4, { align: 'right' });
      pdf.setFont('helvetica', 'bold');
      pdf.text('Page Total:', boxX + 4, y + 2);
      pdf.text(`₹${pageTotal.toFixed(2)}`, boxX + boxW - 4, y + 2, { align: 'right' });

      // On last page, show grand totals and notes
      if (idx === totalPages - 1) {
        let gy = y + 18;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(11);
        pdf.text('Subtotal:', 140, gy);
        pdf.text(`₹${grandSubtotal.toFixed(2)}`, 180, gy, { align: 'right' });
        gy += 6;
        pdf.text('Tax (8%):', 140, gy);
        pdf.text(`₹${grandTax.toFixed(2)}`, 180, gy, { align: 'right' });
        gy += 6;
        pdf.setFont('helvetica', 'bold');
        pdf.text('TOTAL:', 140, gy);
        pdf.text(`₹${grandTotal.toFixed(2)}`, 180, gy, { align: 'right' });

        if (invoiceData.notes) {
          gy += 12;
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(11);
          pdf.text('Notes', marginLeft, gy);
          gy += 6;
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);
          const notesLines = pdf.splitTextToSize(String(invoiceData.notes), 170);
          pdf.text(notesLines, marginLeft, gy);
        }
      }

      // Footer page number
      drawPageNumber(idx + 1, totalPages);
    });

    return pdf;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

export const downloadInvoicePDF = async (invoiceData) => {
  try {
    const pdf = await generateInvoicePDF(invoiceData);
    pdf.save(`Invoice_${invoiceData.invoiceNumber}.pdf`);
  } catch (error) {
    console.error('Error downloading PDF:', error);
    throw error;
  }
};

export const getInvoicePDFBlob = async (invoiceData) => {
  try {
    const pdf = await generateInvoicePDF(invoiceData);
    const blob = pdf.output('blob');
    return blob;
  } catch (error) {
    console.error('Error getting PDF blob:', error);
    throw error;
  }
};