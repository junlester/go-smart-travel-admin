import { NextRequest, NextResponse } from 'next/server';
import { testEmailConfiguration, sendEmailNotification } from '@/utils/emailService';

export async function GET() {
  try {
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, message } = body;

    // Validate required fields
    if (!to || !subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, message' },
        { status: 400 }
      );
    }

    // First test the configuration
    const configTest = await testEmailConfiguration();
    if (!configTest.success) {
      return NextResponse.json(
        { 
          error: 'Email configuration is invalid',
          details: configTest.message
        },
        { status: 400 }
      );
    }

    // Send test email
    const result = await sendEmailNotification({
      to: to,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #10b981;">Test Email from Go Smart Travel Admin</h2>
          <p>This is a test email to verify your email configuration is working correctly.</p>
          <div style="background-color: #f0f9ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Test Message:</h3>
            <p>${message}</p>
          </div>
          <p style="color: #666; font-size: 14px;">
            If you received this email, your Gmail + Nodemailer setup is working correctly! 🎉
          </p>
        </div>
      `,
      text: `Test Email from Go Smart Travel Admin\n\n${message}\n\nIf you received this email, your Gmail + Nodemailer setup is working correctly! 🎉`
    });

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      messageId: result.messageId
    });

  } catch (error) {
    console.error('Error sending test email:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send test email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
