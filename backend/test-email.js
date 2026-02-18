require('dotenv').config();

const SMTP_EMAIL = process.env.SMTP_EMAIL;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;

const transporter = nodemailer.createTransport({
    // service: "gmail", // Comment out service: 'gmail' to force manual host/port config
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: SMTP_EMAIL,
        pass: SMTP_PASSWORD,
    },
    debug: true, // show debug output
    logger: true // log information in console
});

async function sendTestEmail() {
    try {
        console.log("Verifying SMTP connection...");
        await transporter.verify();
        console.log("✅ SMTP Connection Successful!");

        console.log("Attempting to send test email...");
        const info = await transporter.sendMail({
            from: `"Test Service" <${SMTP_EMAIL}>`,
            to: SMTP_EMAIL, // Send to self to test
            subject: "Test Email from Debugger (Port 587)",
            text: "If you receive this, the email service is working on port 587.",
            html: "<b>If you receive this, the email service is working on port 587.</b>"
        });

        console.log("✅ Message sent: %s", info.messageId);
        console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    } catch (error) {
        console.error("❌ Error occurred:");
        console.error(error);
    }
}

sendTestEmail();
