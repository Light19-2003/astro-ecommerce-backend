import nodemailer from "nodemailer";

import dotenv from "dotenv";

dotenv.config();
export const SendEmail = async (email, token) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com", // ✅ SMTP config add kiya
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD, 
      },
    });

    await transporter.sendMail({
      from: `"Internship" <${process.env.EMAIL}>`,
      to: email,
      subject: "Reset Your Password 🔐",
      html: `
      <div style="font-family:Arial; max-width:500px; margin:auto;">
        <h2 style="color:#6366f1;">Forgot Password Request</h2>
        <p>Your password reset token is:</p>
        
        <h2 style="background:#f3f4f6; padding:12px; 
                   border-radius:6px; letter-spacing:2px;">
          ${token}
        </h2>
        
        <p>Use this token in API to reset your password.</p>
      
      
      </div>
    `,
    });

    console.log("Email sent successfully! ✅");
  } catch (ex) {
    console.log(ex);
  }
};
export default SendEmail;
