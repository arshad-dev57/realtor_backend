const express = require('express');
const router = express.Router();
const { sendEmail } = require('../services/email.service');

// Send email endpoint with full request/response logging
router.post('/send-email', async (req, res) => {
  const startTime = Date.now();
  
  console.log('\n========== 📨 API REQUEST RECEIVED ==========');
  console.log('📅 Time:', new Date().toLocaleString());
  console.log('🌐 IP:', req.ip || req.connection.remoteAddress);
  console.log('📦 Headers:', JSON.stringify(req.headers, null, 2));
  
  try {
    const { to, subject, body, fromEmail, fromName } = req.body;
    
    console.log('\n📋 REQUEST BODY:');
    console.log('   - To (Builder):', to);
    console.log('   - From (User Email):', fromEmail);
    console.log('   - From (User Name):', fromName);
    console.log('   - Subject:', subject);
    console.log('   - Body Length:', body?.length || 0);
    
    // Validation
    if (!to || !subject || !body || !fromEmail || !fromName) {
      console.log('\n❌ VALIDATION FAILED: Missing fields');
      console.log('   - to:', !!to);
      console.log('   - subject:', !!subject);
      console.log('   - body:', !!body);
      console.log('   - fromEmail:', !!fromEmail);
      console.log('   - fromName:', !!fromName);
      
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        missing: {
          to: !to,
          subject: !subject,
          body: !body,
          fromEmail: !fromEmail,
          fromName: !fromName
        }
      });
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      console.log('\n❌ VALIDATION FAILED: Invalid builder email format:', to);
      return res.status(400).json({
        success: false,
        message: 'Invalid builder email format',
        email: to
      });
    }
    
    if (!emailRegex.test(fromEmail)) {
      console.log('\n❌ VALIDATION FAILED: Invalid user email format:', fromEmail);
      return res.status(400).json({
        success: false,
        message: 'Invalid your email format',
        email: fromEmail
      });
    }
    
    console.log('\n✅ VALIDATION PASSED');
    
    // Send email
    const result = await sendEmail({ to, subject, body, fromEmail, fromName });
    
    const duration = Date.now() - startTime;
    
    if (result.success) {
      console.log('\n✅ API RESPONSE: SUCCESS');
      console.log('   - Duration:', duration, 'ms');
      console.log('   - Message ID:', result.messageId);
      console.log('   - Sender:', result.from);
      console.log('   - Receiver:', result.to);
      console.log('   - Actual Sender:', result.sender);
      
      res.status(200).json({
        success: true,
        message: 'Email sent successfully',
        messageId: result.messageId,
        from: result.from,
        to: result.to,
        sender: result.sender,
        duration: `${duration}ms`
      });
    } else {
      console.log('\n❌ API RESPONSE: FAILED');
      console.log('   - Duration:', duration, 'ms');
      console.log('   - Error:', result.error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to send email',
        error: result.error
      });
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.error('\n💥 API ERROR:');
    console.error('   - Duration:', duration, 'ms');
    console.error('   - Error:', error.message);
    console.error('   - Stack:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
  
  console.log('\n========== 📨 API REQUEST END ==========\n');
});

module.exports = router;