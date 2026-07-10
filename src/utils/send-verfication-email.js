import nodemailer from "nodemailer";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

export const SendVerficationEmail = async (email, token) => {
  try {
    // Check environment variables
    console.log("EMAIL:", process.env.EMAIL);
    console.log(
      "EMAIL_PASSWORD Exists:",
      process.env.EMAIL_PASSWORD ? "YES" : "NO",
    );
    console.log("FRONTEND_URL:", process.env.FRONTEND_URL);

    if (
      !process.env.EMAIL ||
      !process.env.EMAIL_PASSWORD ||
      !process.env.FRONTEND_URL
    ) {
      throw new Error("Missing required environment variables.");
    }

    // Verification Link
    const verificationLink = `${process.env.FRONTEND_URL}/?token=${token}`;

    // Read HTML template
    const templatePath = path.join(
      process.cwd(),
      "src",
      "templates",
      "emailTemplate.html",
    );

    let html = fs.readFileSync(templatePath, "utf8");

    // Replace placeholder
    html = html.replace(/{{verificationLink}}/g, verificationLink);

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,

      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Verify SMTP Connection
    await transporter.verify();
    console.log("✅ SMTP Server Connected");

    // Send Mail
    const info = await transporter.sendMail({
      from: `"Internship" <${process.env.EMAIL}>`,
      to: email,
      subject: "Verify Your Email",
      html,
    });

    console.log("✅ Email Sent Successfully");
    console.log(info);

    return true;
  } catch (err) {
    console.error("=========== EMAIL ERROR ===========");
    console.error("Message:", err.message);
    console.error("Code:", err.code);
    console.error("Command:", err.command);
    console.error("Response:", err.response);
    console.error("Response Code:", err.responseCode);
    console.error("Stack:", err.stack);
    console.error("===================================");

    return false;
  }
};

export default SendVerficationEmail;
