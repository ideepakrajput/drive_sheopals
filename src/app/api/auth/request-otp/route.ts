import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { sendOTP } from '@/lib/mail';

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // Generate a simple 6 digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

        // Check if user exists
        const [rows]: any = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

        if (rows.length === 0) {
            // For MVP, auto-create user if they don't exist
            const newUserId = uuidv4();
            await pool.query(
                'INSERT INTO users (id, email, name, otp_code, otp_expiry) VALUES (?, ?, ?, ?, ?)',
                [newUserId, email, email.split('@')[0], otp, expiry]
            );
        } else {
            // Update existing user with new OTP
            await pool.query(
                'UPDATE users SET otp_code = ?, otp_expiry = ? WHERE email = ?',
                [otp, expiry, email]
            );
        }

        try {
            await sendOTP(email, otp);
            console.log(`[EMAIL SENT] OTP sent to: ${email}`);
        } catch (mailError) {
            console.error('Failed to send email:', mailError);
            return NextResponse.json({ error: 'Failed to send OTP email' }, { status: 500 });
        }

        return NextResponse.json({ message: 'OTP sent successfully' });
    } catch (error) {
        console.error('Request OTP Error:', error);
        return NextResponse.json({ error: 'Failed to request OTP' }, { status: 500 });
    }
}
