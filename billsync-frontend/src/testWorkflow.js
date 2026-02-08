// Test script to verify mock API functionality
import { invoiceAPI, notificationAPI } from './services/api';

// Test mock invoice workflow
export const testInvoiceWorkflow = async () => {
  console.log('🧪 Testing Invoice Workflow...');
  
  try {
    // Test 1: Create invoice
    console.log('1️⃣ Testing invoice creation...');
    const testInvoice = {
      client: 'Test Customer',
      email: 'test@example.com',
      address: '123 Test St',
      invoiceNumber: 'TEST-001',
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: 'Test invoice',
      items: [
        {
          description: 'Test Item',
          quantity: 2,
          rate: 100,
          amount: 200
        }
      ],
      subtotal: 200,
      tax: 16,
      total: 216
    };
    
    const createdInvoice = await invoiceAPI.createInvoice(testInvoice);
    console.log('✅ Invoice created:', createdInvoice);
    
    // Test 2: Send email
    console.log('2️⃣ Testing email sending...');
    const emailResult = await invoiceAPI.sendInvoiceEmail(createdInvoice.id, {
      toEmail: 'test@example.com',
      subject: 'Test Invoice',
      message: 'Please find your invoice attached.',
      pdfBlob: new Blob(['test pdf content'], { type: 'application/pdf' })
    });
    console.log('✅ Email sent:', emailResult);
    
    // Test 3: Get invoices
    console.log('3️⃣ Testing get invoices...');
    const invoices = await invoiceAPI.getInvoices();
    console.log('✅ Invoices retrieved:', invoices.length);
    
    // Test 4: Notification system
    console.log('4️⃣ Testing notification system...');
    const notifications = await notificationAPI.getNotifications();
    console.log('✅ Notifications retrieved:', notifications.length);
    
    console.log('🎉 All tests passed! The mock API is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Run the test
if (typeof window !== 'undefined') {
  window.testInvoiceWorkflow = testInvoiceWorkflow;
}