import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { Ledger, Transaction } from './supabase';

export function exportLedgerToPDF(ledger: Ledger, transactions: Transaction[]) {
    const doc = new jsPDF();

    // Colors
    const primaryColor = [99, 102, 241] as [number, number, number]; // Indigo
    const greenColor = [16, 185, 129] as [number, number, number]; // Emerald
    const redColor = [244, 63, 94] as [number, number, number]; // Rose
    const grayColor = [107, 114, 128] as [number, number, number];
    const darkColor = [17, 24, 39] as [number, number, number];

    // Calculate totals
    const totalIn = transactions
        .filter(t => t.type === 'cash_in')
        .reduce((sum, t) => sum + t.amount, 0);
    const totalOut = transactions
        .filter(t => t.type === 'cash_out')
        .reduce((sum, t) => sum + t.amount, 0);
    const balance = totalIn - totalOut;

    // Header background
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 45, 'F');

    // Ledger name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(ledger.name, 20, 22);

    // Subtitle
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on ${format(new Date(), 'MMMM dd, yyyy')}`, 20, 32);
    doc.text(`${transactions.length} transactions`, 20, 39);

    // Summary Cards
    const cardY = 55;
    const cardHeight = 25;
    const cardWidth = 55;
    const cardGap = 10;
    const startX = 20;

    // Helper function for formatting numbers (safe for PDF)
    const formatAmount = (amount: number): string => {
        return Math.abs(amount).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };

    // Balance Card
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(startX, cardY, cardWidth, cardHeight, 3, 3, 'F');
    doc.setTextColor(...grayColor);
    doc.setFontSize(9);
    doc.text('BALANCE', startX + 5, cardY + 10);
    doc.setTextColor(...(balance >= 0 ? greenColor : redColor));
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(formatAmount(balance), startX + 5, cardY + 20);

    // Cash In Card
    doc.setFillColor(236, 253, 245);
    doc.roundedRect(startX + cardWidth + cardGap, cardY, cardWidth, cardHeight, 3, 3, 'F');
    doc.setTextColor(...greenColor);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('CASH IN', startX + cardWidth + cardGap + 5, cardY + 10);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(formatAmount(totalIn), startX + cardWidth + cardGap + 5, cardY + 20);

    // Cash Out Card
    doc.setFillColor(255, 241, 242);
    doc.roundedRect(startX + (cardWidth + cardGap) * 2, cardY, cardWidth, cardHeight, 3, 3, 'F');
    doc.setTextColor(...redColor);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('CASH OUT', startX + (cardWidth + cardGap) * 2 + 5, cardY + 10);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(formatAmount(totalOut), startX + (cardWidth + cardGap) * 2 + 5, cardY + 20);


    // Transactions Table
    const tableData = transactions.map(t => [
        format(new Date(t.created_at), 'MMM dd, yyyy'),
        t.title,
        t.category,
        t.type === 'cash_in' ? `+${formatAmount(t.amount)}` : `-${formatAmount(t.amount)}`,
    ]);

    autoTable(doc, {
        startY: cardY + cardHeight + 15,
        head: [['Date', 'Description', 'Category', 'Amount']],
        body: tableData,
        theme: 'plain',
        headStyles: {
            fillColor: [249, 250, 251],
            textColor: darkColor,
            fontStyle: 'bold',
            fontSize: 10,
            cellPadding: 5,
        },
        bodyStyles: {
            textColor: darkColor,
            fontSize: 10,
            cellPadding: 5,
        },
        columnStyles: {
            0: { cellWidth: 35 },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 35 },
            3: { cellWidth: 35, halign: 'right' },
        },
        alternateRowStyles: {
            fillColor: [249, 250, 251],
        },
        didParseCell: (data) => {
            // Color the amount column
            if (data.column.index === 3 && data.section === 'body') {
                const amount = data.cell.raw as string;
                if (amount.startsWith('+')) {
                    data.cell.styles.textColor = greenColor;
                } else if (amount.startsWith('-')) {
                    data.cell.styles.textColor = redColor;
                }
            }
        },
        margin: { left: 20, right: 20 },
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setTextColor(...grayColor);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(
            `Page ${i} of ${pageCount}`,
            doc.internal.pageSize.width / 2,
            doc.internal.pageSize.height - 10,
            { align: 'center' }
        );
    }

    // Generate filename and save
    const filename = `${ledger.name.replace(/[^a-z0-9]/gi, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(filename);
}
