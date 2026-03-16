import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { sendOTP } from '@/lib/mail';
import { ensureUserAuthSchema } from '@/lib/admin-auth';

const USER_LOGIN_BLOCKED_MESSAGE = 'Only users added by the administrator can log in.';
const USER_DISABLED_MESSAGE = 'Your account is disabled. Contact your administrator.';

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        await ensureUserAuthSchema();

        // Generate a simple 6 digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

        const [rows]: any = await pool.query(
            'SELECT id, is_admin, is_active FROM users WHERE email = ? LIMIT 1',
            [email]
        );

        if (rows.length === 0 || rows[0].is_admin) {
            return NextResponse.json({ error: USER_LOGIN_BLOCKED_MESSAGE }, { status: 403 });
        }

        if (!rows[0].is_active) {
            return NextResponse.json({ error: USER_DISABLED_MESSAGE }, { status: 403 });
        }

        await pool.query(
            'UPDATE users SET otp_code = ?, otp_expiry = ? WHERE email = ?',
            [otp, expiry, email]
        );

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
