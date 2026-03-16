import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { encrypt } from '@/lib/auth';
import { cookies } from 'next/headers';
import { ensureUserAuthSchema } from '@/lib/admin-auth';

export async function POST(req: Request) {
    try {
        const { email, otp } = await req.json();

        if (!email || !otp) {
            return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
        }

        await ensureUserAuthSchema();

        const [rows]: any = await pool.query(
            'SELECT id, email, name, is_admin FROM users WHERE email = ? AND otp_code = ? AND otp_expiry > NOW() AND is_admin = FALSE',
            [email, otp]
        );

        if (rows.length === 0) {
            return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 401 });
        }

        const user = rows[0];

        // Clear OTP after successful use
        await pool.query('UPDATE users SET otp_code = NULL, otp_expiry = NULL WHERE email = ?', [email]);

        // Create session
        const sessionCookieValue = await encrypt({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                isAdmin: Boolean(user.is_admin),
            },
        });

        const cookieStore = await cookies();
        cookieStore.set('session', sessionCookieValue, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 24 * 60 * 60, // 24 hours
        });

        return NextResponse.json({ message: 'Login successful' });
    } catch (error) {
        console.error('Verify OTP Error:', error);
        return NextResponse.json({ error: 'Failed to verify OTP' }, { status: 500 });
    }
}
