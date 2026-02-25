const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generate invoice PDF for a booking
 * @param {Object} invoiceData - Invoice data
 * @param {Object} invoiceData.booking - Booking information
 * @param {Object} invoiceData.client - Client information
 * @param {Object} invoiceData.provider - Provider information
 * @param {Object} invoiceData.payment - Payment information
 * @param {Array} invoiceData.services - Services in the booking
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateInvoicePDF(invoiceData) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const buffers = [];
            
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfBuffer = Buffer.concat(buffers);
                resolve(pdfBuffer);
            });
            doc.on('error', reject);
            
            // Header
            doc.fontSize(24)
               .fillColor('#1E293B')
               .text('INVOICE', { align: 'center' });
            
            doc.moveDown(0.5);
            
            // Invoice Number and Date
            const invoiceNumber = `INV-${invoiceData.booking.id}-${Date.now()}`;
            const invoiceDate = new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            
            doc.fontSize(10)
               .fillColor('#64748B')
               .text(`Invoice #: ${invoiceNumber}`, { align: 'right' })
               .text(`Date: ${invoiceDate}`, { align: 'right' });
            
            doc.moveDown(1);
            
            // Provider Information (Left)
            doc.fontSize(12)
               .fillColor('#1E293B')
               .font('Helvetica-Bold')
               .text('From:', 50, doc.y);
            
            doc.font('Helvetica')
               .fontSize(10)
               .fillColor('#374151')
               .text(invoiceData.provider.name || 'Service Provider', 50, doc.y + 5)
               .text(invoiceData.provider.email || '', 50, doc.y)
               .text(invoiceData.provider.address || '', 50, doc.y);
            
            // Client Information (Right)
            const clientX = 300;
            doc.font('Helvetica-Bold')
               .fontSize(12)
               .fillColor('#1E293B')
               .text('Bill To:', clientX, doc.y - 60);
            
            doc.font('Helvetica')
               .fontSize(10)
               .fillColor('#374151')
               .text(invoiceData.client.name || 'Client', clientX, doc.y + 5)
               .text(invoiceData.client.email || '', clientX, doc.y)
               .text(invoiceData.client.address || '', clientX, doc.y);
            
            doc.moveDown(2);
            
            // Booking Details
            doc.font('Helvetica-Bold')
               .fontSize(12)
               .fillColor('#1E293B')
               .text('Booking Details:', 50, doc.y);
            
            doc.font('Helvetica')
               .fontSize(10)
               .fillColor('#374151')
               .text(`Event: ${invoiceData.booking.eventName}`, 50, doc.y + 5)
               .text(`Date: ${invoiceData.booking.date}`, 50, doc.y)
               .text(`Time: ${invoiceData.booking.time}`, 50, doc.y)
               .text(`Location: ${invoiceData.booking.location}`, 50, doc.y);
            
            doc.moveDown(1.5);
            
            // Services Table Header
            const tableTop = doc.y;
            doc.font('Helvetica-Bold')
               .fontSize(10)
               .fillColor('#FFFFFF')
               .rect(50, tableTop, 500, 25)
               .fill('#4a55e1');
            
            doc.text('Service', 60, tableTop + 8);
            doc.text('Quantity', 250, tableTop + 8);
            doc.text('Unit Price', 350, tableTop + 8);
            doc.text('Total', 450, tableTop + 8, { align: 'right' });
            
            // Services Table Rows
            let currentY = tableTop + 25;
            invoiceData.services.forEach((service, index) => {
                const rowHeight = 30;
                const isEven = index % 2 === 0;

                if (isEven) {
                    doc.rect(50, currentY, 500, rowHeight)
                       .fill('#F8FAFC');
                }

                doc.font('Helvetica')
                   .fontSize(9)
                   .fillColor('#1E293B')
                   .text(service.name || 'Service', 60, currentY + 8, { width: 180 });

                doc.text(service.quantity.toString(), 250, currentY + 8);
                doc.text(`₱${parseFloat(service.unitPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 350, currentY + 8);
                doc.text(`₱${parseFloat(service.totalPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 450, currentY + 8, { align: 'right' });

                currentY += rowHeight;
            });

            // Package Breakdown (if included)
            if (invoiceData.package && invoiceData.package.name) {
                const pkg = invoiceData.package;

                doc.moveDown(0.5);
                currentY = doc.y + 10;

                // Package Header
                doc.font('Helvetica-Bold')
                   .fontSize(11)
                   .fillColor('#059669')
                   .text(`📦 Package: ${pkg.name}`, 50, currentY);

                if (pkg.description) {
                    doc.font('Helvetica')
                       .fontSize(9)
                       .fillColor('#6B7280')
                       .text(pkg.description, 50, doc.y + 3, { width: 500 });
                }

                currentY = doc.y + 10;

                // Package categories and items
                if (pkg.categories && Array.isArray(pkg.categories)) {
                    pkg.categories.forEach((category, catIndex) => {
                        if (!category.name) return;

                        // Category header
                        doc.font('Helvetica-Bold')
                           .fontSize(10)
                           .fillColor('#374151')
                           .text(category.name, 60, currentY);

                        currentY = doc.y + 5;

                        // Category items
                        if (category.items && Array.isArray(category.items)) {
                            let categoryTotal = 0;

                            category.items.forEach((item, itemIndex) => {
                                if (!item.name) return;

                                const itemTotal = (item.quantity || 1) * (parseFloat(item.unitPrice) || 0);
                                categoryTotal += itemTotal;

                                const isRemoved = pkg.removedItems && pkg.removedItems.includes(item.id);

                                // Item row
                                doc.font('Helvetica')
                                   .fontSize(8)
                                   .fillColor(isRemoved ? '#9CA3AF' : '#1E293B');

                                const itemText = isRemoved
                                    ? `  - ${item.name} (REMOVED)`
                                    : `  - ${item.name}`;

                                doc.text(itemText, 70, currentY, { width: 170, continued: false });

                                if (!isRemoved) {
                                    doc.text(`${item.quantity || 1} ${item.unit || 'pc'}`, 250, currentY);
                                    doc.text(`₱${parseFloat(item.unitPrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 320, currentY);
                                    doc.text(`₱${itemTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 450, currentY, { align: 'right' });
                                }

                                currentY = doc.y + 3;
                            });

                            // Category subtotal
                            doc.font('Helvetica')
                               .fontSize(8)
                               .fillColor('#6B7280')
                               .text(`Category Subtotal: ₱${categoryTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 400, currentY, { align: 'right' });

                            currentY = doc.y + 8;
                        }
                    });
                }

                // Package totals
                currentY = doc.y + 5;

                if (pkg.discountPercent && pkg.discountPercent > 0) {
                    doc.font('Helvetica')
                       .fontSize(9)
                       .fillColor('#DC2626')
                       .text(`Package Discount: ${pkg.discountPercent}%`, 350, currentY, { align: 'right' });
                    currentY = doc.y + 3;
                }

                doc.font('Helvetica-Bold')
                   .fontSize(10)
                   .fillColor('#059669')
                   .text(`Package Total: ₱${parseFloat(pkg.totalPrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 350, currentY, { align: 'right' });

                if (pkg.paxCount && pkg.paxCount > 1) {
                    doc.font('Helvetica')
                       .fontSize(8)
                       .fillColor('#6B7280')
                       .text(`(for ${pkg.paxCount} pax)`, 350, doc.y + 2, { align: 'right' });
                }

                currentY = doc.y + 15;
            }

            // Total Section
            const totalY = currentY + 10;
            doc.rect(300, totalY, 250, 100)
               .fill('#F8FAFC')
               .stroke('#E2E8F0');

            const servicesSubtotal = invoiceData.booking.totalCost || 0;
            const packageTotal = invoiceData.package ? parseFloat(invoiceData.package.totalPrice || 0) : 0;
            const subtotal = servicesSubtotal + packageTotal;
            const tax = 0; // No tax for now
            const total = subtotal;
            
            doc.font('Helvetica')
               .fontSize(10)
               .fillColor('#374151')
               .text('Services:', 320, totalY + 10)
               .text(`₱${servicesSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 450, totalY + 10, { align: 'right' });

            if (packageTotal > 0) {
                doc.text('Package:', 320, totalY + 25)
                   .text(`₱${packageTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 450, totalY + 25, { align: 'right' });
            }

            doc.text('Tax:', 320, totalY + (packageTotal > 0 ? 40 : 30))
               .text(`₱${tax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 450, totalY + (packageTotal > 0 ? 40 : 30), { align: 'right' });

            doc.font('Helvetica-Bold')
               .text('Total:', 320, totalY + (packageTotal > 0 ? 60 : 50))
               .fontSize(12)
               .text(`₱${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 450, totalY + (packageTotal > 0 ? 60 : 50), { align: 'right' });
            
            // Payment Information
            doc.moveDown(3);
            doc.font('Helvetica-Bold')
               .fontSize(12)
               .fillColor('#1E293B')
               .text('Payment Information:', 50, doc.y);
            
            doc.font('Helvetica')
               .fontSize(10)
               .fillColor('#374151')
               .text(`Payment Method: ${invoiceData.payment.method}`, 50, doc.y + 5)
               .text(`Payment Status: ${invoiceData.payment.status}`, 50, doc.y)
               .text(`Payment Date: ${invoiceData.payment.paidAt || invoiceDate}`, 50, doc.y)
               .text(`Transaction ID: ${invoiceData.payment.transactionId || 'N/A'}`, 50, doc.y);
            
            // Footer
            const footerY = 750;
            doc.font('Helvetica')
               .fontSize(8)
               .fillColor('#94A3B8')
               .text('Thank you for your business!', 50, footerY, { align: 'center' })
               .text('This is an automated invoice generated by the Event Management System.', 50, footerY + 15, { align: 'center' });
            
            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}

module.exports = {
    generateInvoicePDF
};

