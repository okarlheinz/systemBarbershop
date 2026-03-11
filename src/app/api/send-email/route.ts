import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { destinatario, assunto, mensagem } = await request.json();

    // Configuração do transporte (use variáveis de ambiente)
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,      // ex.: smtp.gmail.com
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: false,                      // true para 465
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Agendamentos" <${process.env.EMAIL_FROM}>`,
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