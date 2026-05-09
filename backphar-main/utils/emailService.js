// utils/emailService.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const port = Number(process.env.SMTP_PORT) || 587;
const secure = port === 465;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port,
  secure,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false, // pour tests sur Mailtrap ou certifs auto-signés
  },
});

// Vérification SMTP
transporter.verify()
  .then(() => console.log('✔️ SMTP connection OK'))
  .catch(err => console.error('❌ SMTP connection error:', err));

export async function sendCredentialsEmail(to, password, role) {
  const mailOptions = {
    from: `"PharmaConnect" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Bienvenue sur PharmaConnect – Vos identifiants',
    html: `
      <p>Bonjour,</p>
      <p>Votre compte <strong>${role}</strong> a bien été créé.</p>
      <ul>
        <li>Email : <strong>${to}</strong></li>
        <li>Mot de passe : <strong>${password}</strong></li>
      </ul>
      <p>Merci de changer votre mot de passe lors de votre première connexion.</p>
    `,
  };
  return transporter.sendMail(mailOptions);
}
