import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

async function testEmail() {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Verify SMTP connection
    await transporter.verify();
    console.log("✅ SMTP Connected");

    // Send test email
    const info = await transporter.sendMail({
      from: process.env.EMAIL,
      to: "semwalakshit19@gmail.com", // Replace with your email
      subject: "Nodemailer Test",
      text: "Hello! This is a test email from Nodemailer.",
    });

    console.log("✅ Email Sent");
    console.log(info);
  } catch (err) {
    console.error("❌ Error:", err);
  }
}

export default testEmail;
