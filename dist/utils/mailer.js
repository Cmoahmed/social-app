import nodemailer from 'nodemailer';
import { config } from '../config/index.js';
// Question 5: What Is OOP?
// Question 10: Implement Class
// Question 16: Interface
export class SmtpMailer {
    transport;
    constructor() {
        this.transport = nodemailer.createTransport({ host: config.SMTP_HOST, port: config.SMTP_PORT, secure: config.SMTP_SECURE });
    }
    async sendCredential(email, purpose, token) {
        await this.transport.sendMail({ from: config.MAIL_FROM, to: email,
            subject: purpose === 'verify' ? 'Verify your Social App account' : 'Reset your Social App password',
            text: `Your ${purpose} credential: ${token}\nSubmit it to POST /api/auth/${purpose === 'verify' ? 'verify-email' : 'reset-password'}.\nExpires in ${purpose === 'verify' ? '24 hours' : '30 minutes'}.` });
    }
}
//# sourceMappingURL=mailer.js.map