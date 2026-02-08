import emailjs from 'emailjs-com';

// Initialize EmailJS with your public key
// You should replace these with your actual EmailJS credentials
const EMAILJS_PUBLIC_KEY = 'YOUR_PUBLIC_KEY';
const EMAILJS_SERVICE_ID = 'YOUR_SERVICE_ID';
const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID';

// Initialize EmailJS
emailjs.init(EMAILJS_PUBLIC_KEY);

export const sendInvoiceEmail = async (invoiceData, pdfBlob) => {
  try {
    // Convert blob to base64
    const reader = new FileReader();
    
    return new Promise((resolve, reject) => {
      reader.onloadend = async () => {
        try {
          const base64PDF = reader.result.split(',')[1];
          
          const templateParams = {
            to_email: invoiceData.email,
            to_name: invoiceData.client,
            from_name: 'BillSync Office Supplies',
            invoice_number: invoiceData.invoiceNumber,
            invoice_date: invoiceData.invoiceDate,
            due_date: invoiceData.dueDate,
            total_amount: invoiceData.items.reduce((sum, item) => sum + item.amount, 0) * 1.08, // Including 8% tax
            message: `Please find attached your invoice ${invoiceData.invoiceNumber}. Payment is due by ${invoiceData.dueDate}.`,
            attachment: base64PDF,
            attachment_name: `Invoice_${invoiceData.invoiceNumber}.pdf`
          };

          const response = await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_ID,
            templateParams
          );

          console.log('Email sent successfully:', response);
          resolve(response);
        } catch (error) {
          console.error('Error sending email:', error);
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read PDF file'));
      };

      reader.readAsDataURL(pdfBlob);
    });
  } catch (error) {
    console.error('Error in sendInvoiceEmail:', error);
    throw error;
  }
};

export const sendNotificationEmail = async (notificationData) => {
  try {
    const templateParams = {
      to_email: notificationData.toEmail,
      to_name: notificationData.toName,
      subject: notificationData.subject,
      message: notificationData.message,
      from_name: 'BillSync Notifications'
    };

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      'notification_template', // You need to create this template in EmailJS
      templateParams
    );

    console.log('Notification email sent:', response);
    return response;
  } catch (error) {
    console.error('Error sending notification email:', error);
    throw error;
  }
};

// Mock function for development (when EmailJS credentials are not available)
export const mockSendInvoiceEmail = async (invoiceData, pdfBlob) => {
  console.log('Mock email sent to:', invoiceData.email);
  console.log('Invoice details:', {
    invoiceNumber: invoiceData.invoiceNumber,
    client: invoiceData.client,
    total: invoiceData.items.reduce((sum, item) => sum + item.amount, 0) * 1.08
  });
  
  // Simulate email sending delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    status: 200,
    text: 'Mock email sent successfully'
  };
};