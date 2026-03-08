export function gerarSlotsDeHorario(inicio: string, fim: string, intervalo: number): string[] {
  const slots: string[] = [];
  
  // Transformamos as strings "08:00" em minutos totais para facilitar a conta
  const [horaInicio, minInicio] = inicio.split(':').map(Number);
  const [horaFim, minFim] = fim.split(':').map(Number);

  let atualEmMinutos = horaInicio * 60 + minInicio;
  const fimEmMinutos = horaFim * 60 + minFim;

  // Enquanto o horário atual for menor que o fim do expediente...
  while (atualEmMinutos < fimEmMinutos) {
    const horas = Math.floor(atualEmMinutos / 60);
    const minutos = atualEmMinutos % 60;

    // Formatamos para ficar bonitinho: 08:30 em vez de 8:3
    const horarioFormatado = `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
    
    slots.push(horarioFormatado);
    
    // Pulamos para o próximo slot baseado no intervalo (ex: +30 min)
    atualEmMinutos += intervalo;
  }

  return slots;
}

export function aplicarMascaraWhatsapp(valor: string): string {
  // Remove tudo que não for número
  const apenasNumeros = valor.replace(/\D/g, '');
  
  // Limita a 11 dígitos
  const numerosLimitados = apenasNumeros.slice(0, 11);

  // Aplica a formatação (XX) XXXXX-XXXX
  return numerosLimitados
    .replace(/^(\d{2})(\d)/g, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}