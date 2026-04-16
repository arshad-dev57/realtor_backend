const nodemailer = require('nodemailer');

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  debug: true, // ✅ Enable debug mode
  logger: true, // ✅ Enable logging
});

// Send email function with full debugging
const sendEmail = async ({ to, subject, body, fromEmail, fromName }) => {
  try {
    console.log('\n========== 📧 EMAIL SENDING START ==========');
    console.log('📨 SENDER DETAILS:');
    console.log('   - Name:', fromName);
    console.log('   - Email:', fromEmail);
    console.log('   - IP:', 'Client IP logged');
    
    console.log('\n📭 RECEIVER DETAILS:');
    console.log('   - Builder Email:', to);
    
    console.log('\n📝 EMAIL CONTENT:');
    console.log('   - Subject:', subject);
    console.log('   - Body Length:', body.length, 'characters');
    console.log('   - Body Preview:', body.substring(0, 200) + '...');
    
    console.log('\n⚙️ SMTP CONFIGURATION:');
    console.log('   - Service: Gmail');
    console.log('   - From (actual sender):', process.env.EMAIL_USER);
    console.log('   - Auth Method: OAuth2 / App Password');
    
    const mailOptions = {
      from: `"${fromName} (via Estate App)" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      text: body,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <div style="background-color: #3498db; color: white; padding: 10px; text-align: center; border-radius: 5px;">
            <h2 style="margin: 0;">🏠 New Property Inquiry</h2>
          </div>
          
          <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 8px;">
            <p><strong>👤 From:</strong> ${fromName}</p>
            <p><strong>📧 Email:</strong> ${fromEmail}</p>
            <p><strong>📅 Date:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <div style="margin: 20px 0;">
            <h3 style="color: #2c3e50;">Message:</h3>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #3498db;">
              <pre style="white-space: pre-wrap; font-family: Arial, sans-serif; margin: 0; font-size: 14px;">${body}</pre>
            </div>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #7f8c8d; text-align: center;">
            <p>This message was sent from Estate App by ${fromName} (${fromEmail})</p>
            <p>Reply directly to: ${fromEmail}</p>
          </div>
        </div>
      `,
    };

    console.log('\n📤 SENDING EMAIL VIA SMTP...');
    const info = await transporter.sendMail(mailOptions);
    
    console.log('\n✅ EMAIL SENT SUCCESSFULLY!');
    console.log('📧 Message ID:', info.messageId);
    console.log('📧 Response:', info.response);
    console.log('📧 Accepted Recipients:', info.accepted);
    console.log('📧 Rejected Recipients:', info.rejected);
    console.log('📧 Pending Recipients:', info.pending);
    
    console.log('\n📊 DELIVERY SUMMARY:');
    console.log('   - From:', process.env.EMAIL_USER);
    console.log('   - To:', to);
    console.log('   - Sent by:', fromName, `(${fromEmail})`);
    console.log('   - Status: Delivered to SMTP server');
    console.log('   - Timestamp:', new Date().toISOString());
    
    console.log('\n========== 📧 EMAIL SENDING END ==========\n');
    
    return { 
      success: true, 
      messageId: info.messageId,
      from: process.env.EMAIL_USER,
      to: to,
      sender: { name: fromName, email: fromEmail }
    };
  } catch (error) {
    console.error('\n❌ EMAIL SEND FAILED!');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    console.error('Command:', error.command);
    console.error('Response:', error.response);
    console.error('Stack:', error.stack);
    console.log('\n========== 📧 EMAIL SENDING FAILED ==========\n');
    
    return { success: false, error: error.message };
  }
};

module.exports = { sendEmail };