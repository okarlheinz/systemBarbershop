import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { destinatario, assunto, mensagem } = await request.json();

    // Configuração do transporte (use variáveis de ambiente)
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,      // ex.: smtp.gmail.com
      port: Number(process.env.EMAIL_PORT) || 465,
      secure: true,                      // true para 465
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      // Isso evita erros de certificado em servidores brasileiros
      tls: {
        // Isso força o Node a aceitar o certificado da Hostinger mesmo em localhost
        rejectUnauthorized: false,
        minVersion: "TLSv1.2"
      }
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: destinatario,
      subject: assunto,
      text: mensagem,
      html: mensagem.replace(/\n/g, '<br>'),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
    return NextResponse.json(
      { error: 'Falha no envio do e-mail' },
      { status: 500 }
    );
  }
}