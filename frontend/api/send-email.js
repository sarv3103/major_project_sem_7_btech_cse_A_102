import nodemailer from "nodemailer";

export default async function handler(req, res) {
  // Allow cross-origin requests from Render and other services
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const { to, subject, html, text, secret } = req.body || {};

  const EXPECTED_SECRET = process.env.LIVE_GATEWAY_SECRET || "SecureWheelsLiveGateway2026";
  if (secret !== EXPECTED_SECRET) {
    return res.status(401).json({ error: "Unauthorized dispatch request." });
  }

  if (!to || !subject) {
    return res.status(400).json({ error: "Missing required parameters: 'to' and 'subject'." });
  }

  try {
    const user = process.env.SMTP_USER || "securewheelsadmin@gmail.com";
    const pass = process.env.SMTP_PASS || "ycioaavlqoqarrhe";

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true, // Use SSL for instant port 465 delivery
      auth: {
        user,
        pass
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const info = await transporter.sendMail({
      from: `"SecureWheels General Insurance" <${user}>`,
      to,
      subject,
      text: text || undefined,
      html: html || undefined
    });

    console.log(`[Vercel Mail Relay] Successfully sent email to ${to}: ${info.messageId}`);
    return res.status(200).json({
      success: true,
      messageId: info.messageId,
      provider: "Live Gmail SMTP via Vercel HTTPS Relay"
    });
  } catch (error) {
    console.error("[Vercel Mail Relay] Error sending email:", error);
    return res.status(500).json({
      error: error.message || "Failed to dispatch email",
      provider: "Vercel Relay Failure"
    });
  }
}
