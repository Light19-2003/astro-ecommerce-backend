import { verifySmtpConnection } from "../utils/email.js";

async function testEmail(req, res) {
  try {
    await verifySmtpConnection();

    return res.status(200).json({
      message: "SMTP connected successfully",
    });
  } catch (err) {
    console.error("SMTP Error:", err);

    return res.status(500).json({
      message: "SMTP connection failed",
      error: err.message,
    });
  }
}

export default testEmail;
