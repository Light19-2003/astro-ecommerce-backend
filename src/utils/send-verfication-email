import nodemailer from "nodemailer";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

export const SendVerficationEmail = async (email, token) => {
  try {
    // Frontend URL
    const verificationLink = `${process.env.FRONTEND_URL}/?token=${token}`;

    // Read HTML template
    const templatePath = path.join(
      process.cwd(),
      "src",
      "templates",
      "emailTemplate.html",
    );
    console.log(verificationLink);

    let html = fs.readFileSync(templatePath, "utf8");

    // Replace placeholder
    html = html.replace(/{{verificationLink}}/g, verificationLink);

    console.log(verificationLink);
    console.log(html);

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Send mail
    await transporter.sendMail({
      from: `"Internship" <${process.env.EMAIL}>`,
      to: email,
      subject: "Verify Your Email",
      html,
    });

    console.log("✅ Email sent successfully");
    console.log(verificationLink);
    console.log(html);
  } catch (err) {
    console.log(err);
  }
};

export default SendVerficationEmail;
