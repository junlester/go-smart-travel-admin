import { NextRequest, NextResponse } from 'next/server';
import { sendEmailNotification, EmailNotificationData } from '@/utils/emailService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, message, bookingId, userName, tourName } = body;

    // Validate required fields
    if (!to || !subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, message' },
        { status: 400 }
      );
    }

    // Create email template with booking context
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
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
          .booking-info {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #10b981;
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
            <h2 style="color: #10b981; margin-top: 0;">${subject}</h2>
            
            ${bookingId && userName && tourName ? `
              <div class="booking-info">
                <h3 style="margin-top: 0; color: #10b981;">Booking Information</h3>
                <p><strong>Customer:</strong> ${userName}</p>
                <p><strong>Tour:</strong> ${tourName}</p>
                <p><strong>Booking ID:</strong> ${bookingId}</p>
              </div>
            ` : ''}
            
            <div class="message">
              ${message.replace(/\n/g, '<br>')}
            </div>
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

    const emailData: EmailNotificationData = {
      to: to,
      subject: subject,
      html: html,
      text: message // Plain text version
    };

    const result = await sendEmailNotification(emailData);

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      messageId: result.messageId
    });

  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Test endpoint to verify email configuration
export async function GET() {
  try {
    const { testEmailConfiguration } = await import('@/utils/emailService');
    const result = await testEmailConfiguration();
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error testing email configuration:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to test email configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
