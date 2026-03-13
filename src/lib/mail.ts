import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export const sendOTP = async (to: string, otp: string) => {
  const mailOptions = {
    from: `"Sheopal's Drive" <${process.env.SMTP_USER}>`,
    to,
    subject: "Your Sheopal's Drive Access OTP",
    html: `
      <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; padding: 20px; text-align: center; color: #333;">
        <h2 style="color: #4f46e5;">Welcome to Sheopal's Drive</h2>
        <p style="font-size: 16px;">Here is your one-time password to access the platform:</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h1 style="margin: 0; font-size: 32px; letter-spacing: 4px; color: #111827;">${otp}</h1>
        </div>
        <p style="font-size: 14px; color: #6b7280;">This code will expire in 10 minutes.</p>
        <p style="font-size: 12px; color: #9ca3af; margin-top: 40px;">If you didn't request this code, you can safely ignore this email.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};
