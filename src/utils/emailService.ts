import nodemailer from 'nodemailer';

// Create transporter - simplified Gmail configuration
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER || 'your-email@gmail.com',
      pass: process.env.GMAIL_APP_PASSWORD || 'your-app-password'
    }
  });
};

// Email notification interface
export interface EmailNotificationData {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

// HTML email templates
const createEmailTemplate = (title: string, message: string, actionUrl?: string, imageUrl?: string) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f4f4f4;
        }
        .container {
          background-color: #ffffff;
          border-radius: 10px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }
        .content {
          padding: 30px;
        }
        .message {
          font-size: 16px;
          line-height: 1.8;
          margin-bottom: 30px;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 25px;
          font-weight: 600;
          margin: 20px 0;
          transition: transform 0.2s;
        }
        .cta-button:hover {
          transform: translateY(-2px);
        }
        .footer {
          background-color: #f8f9fa;
          padding: 20px;
          text-align: center;
          color: #6b7280;
          font-size: 14px;
        }
        .logo {
          width: 60px;
          height: 60px;
          margin: 0 auto 20px;
          background-color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: bold;
          color: #10b981;
        }
        .image-container {
          text-align: center;
          margin: 20px 0;
        }
        .image-container img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
        }
        @media (max-width: 600px) {
          body {
            padding: 10px;
          }
          .header, .content {
            padding: 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🚀</div>
          <h1>Go Smart Travel</h1>
        </div>
        <div class="content">
          <h2 style="color: #10b981; margin-top: 0;">${title}</h2>
          ${imageUrl ? `
            <div class="image-container">
              <img src="${imageUrl}" alt="${title}" />
            </div>
          ` : ''}
          <div class="message">
            ${message.replace(/\n/g, '<br>')}
          </div>
          ${actionUrl ? `
            <div style="text-align: center;">
              <a href="${actionUrl}" class="cta-button">View Details</a>
            </div>
          ` : ''}
        </div>
        <div class="footer">
          <p>Thank you for using Go Smart Travel!</p>
          <p>If you have any questions, please contact our support team.</p>
          <p style="margin-top: 20px; font-size: 12px;">
            This email was sent from Go Smart Travel Admin Panel.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Send email notification
 */
export const sendEmailNotification = async (emailData: EmailNotificationData) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: emailData.from || `"Go Smart Travel" <${process.env.GMAIL_USER}>`,
      to: Array.isArray(emailData.to) ? emailData.to.join(', ') : emailData.to,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text || emailData.html.replace(/<[^>]*>/g, '') // Strip HTML for text version
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('📧 Email sent successfully:', result.messageId);
    
    return {
      success: true,
      messageId: result.messageId,
      message: 'Email sent successfully'
    };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw error;
  }
};

/**
 * Send notification email to multiple recipients
 */
export const sendBulkEmailNotification = async (
  recipients: string[],
  subject: string,
  message: string,
  actionUrl?: string,
  imageUrl?: string
) => {
  try {
    console.log(`📧 Sending email to ${recipients.length} recipients...`);
    
    const html = createEmailTemplate(subject, message, actionUrl, imageUrl);
    
    // Send individual emails to each recipient to maintain privacy
    const transporter = createTransporter();
    const results = [];
    let successCount = 0;
    let failCount = 0;
    
    for (const recipient of recipients) {
      try {
        const mailOptions = {
          from: `"Go Smart Travel" <${process.env.GMAIL_USER}>`,
          to: recipient,
          subject: subject,
          html: html,
          text: html.replace(/<[^>]*>/g, '') // Strip HTML for text version
        };

        const result = await transporter.sendMail(mailOptions);
        results.push({ recipient, success: true, messageId: result.messageId });
        successCount++;
        console.log(`✅ Email sent to ${recipient}`);
      } catch (error: any) {
        console.error(`❌ Error sending email to ${recipient}:`, error);
        results.push({ recipient, success: false, error: error.message });
        failCount++;
      }
    }
    
    return {
      success: successCount > 0,
      message: `Email sent to ${successCount} recipients${failCount > 0 ? `, ${failCount} failed` : ''}`,
      messageId: `bulk-${Date.now()}`,
      results: results
    };
  } catch (error) {
    console.error('❌ Error sending bulk email:', error);
    throw error;
  }
};

/**
 * Send trip reminder email
 */
export const sendTripReminderEmail = async (
  email: string,
  destination: string,
  startDate: string,
  tripId: string
) => {
  const subject = `Trip Reminder: ${destination}`;
  const message = `
    Your amazing trip to ${destination} is starting on ${startDate}!
    
    We're excited to help you create unforgettable memories. Here are some quick reminders:
    
    • Check your packing list
    • Confirm your transportation
    • Review your itinerary
    • Don't forget your travel documents
    
    Get ready for an incredible adventure!
  `;
  
  const actionUrl = `https://your-app.com/trip/${tripId}`;
  
  const html = createEmailTemplate(subject, message, actionUrl);
  
  return await sendEmailNotification({
    to: email,
    subject: subject,
    html: html
  });
};

/**
 * Send weather alert email
 */
export const sendWeatherAlertEmail = async (
  email: string,
  location: string,
  condition: string,
  temperature: string,
  advice: string
) => {
  const subject = `Weather Alert: ${location}`;
  const message = `
    Weather Update for ${location}
    
    Current Condition: ${condition}
    Temperature: ${temperature}
    
    Travel Advice: ${advice}
    
    Stay safe and enjoy your travels!
  `;
  
  const html = createEmailTemplate(subject, message);
  
  return await sendEmailNotification({
    to: email,
    subject: subject,
    html: html
  });
};

/**
 * Send promotional email
 */
export const sendPromotionalEmail = async (
  email: string,
  title: string,
  message: string,
  promoCode: string,
  discount: string,
  destination: string
) => {
  const subject = `🎉 Special Offer: ${title}`;
  const emailMessage = `
    ${message}
    
    🎁 Promo Code: ${promoCode}
    💰 Discount: ${discount}
    🌍 Destination: ${destination}
    
    Don't miss out on this amazing deal! Book now and save big on your next adventure.
  `;
  
  const actionUrl = `https://your-app.com/promo/${promoCode}`;
  
  const html = createEmailTemplate(subject, emailMessage, actionUrl);
  
  return await sendEmailNotification({
    to: email,
    subject: subject,
    html: html
  });
};

/**
 * Test email configuration
 */
export const testEmailConfiguration = async () => {
  try {
    // Check if environment variables are set
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return { 
        success: false, 
        message: 'GMAIL_USER and GMAIL_APP_PASSWORD environment variables are required' 
      };
    }

    // Check if using default values (indicating not configured)
    if (process.env.GMAIL_USER === 'your-email@gmail.com' || process.env.GMAIL_APP_PASSWORD === 'your-app-password') {
      return { 
        success: false, 
        message: 'Please configure your actual Gmail credentials in .env.local' 
      };
    }

    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ Email configuration is valid');
    return { 
      success: true, 
      message: 'Email configuration is valid',
      config: {
        service: 'gmail',
        user: process.env.GMAIL_USER
      }
    };
  } catch (error: any) {
    console.error('❌ Email configuration error:', error);
    
    // Provide specific error messages for common issues
    let errorMessage = error.message || 'Unknown error';
    if (error.code === 'EAUTH') {
      errorMessage = 'Authentication failed. Please check your Gmail app password and ensure 2-factor authentication is enabled.';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Connection failed. Please check your internet connection and SMTP settings.';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Connection timeout. Please check your SMTP settings and try again.';
    }
    
    return { 
      success: false, 
      message: errorMessage,
      error: error.code || 'UNKNOWN'
    };
  }
};
