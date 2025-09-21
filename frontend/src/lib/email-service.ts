// Servicio simple para enviar emails con los datos del formulario
export interface DemoLeadData {
  name: string;
  email: string;
  phone?: string;
  company: string;
  industry: string;
  teamSize?: string;
  currentChallenges?: string;
  expectedResults?: string;
}

export async function sendDemoLeadEmail(data: DemoLeadData): Promise<boolean> {
  try {
    // Opción 1: EmailJS (más simple)
    // Opción 2: Nodemailer con Gmail/SMTP
    // Opción 3: SendGrid, Resend, etc.
    
    const emailContent = `
Nuevo Lead de Demo - Simbiosia

Información Personal:
- Nombre: ${data.name}
- Email: ${data.email}
- Teléfono: ${data.phone || 'No proporcionado'}

Información de Empresa:
- Empresa: ${data.company}
- Sector: ${data.industry}
- Tamaño del equipo: ${data.teamSize || 'No especificado'}

Objetivos:
- Desafíos actuales: ${data.currentChallenges || 'No especificado'}
- Resultados esperados: ${data.expectedResults || 'No especificado'}

Fecha: ${new Date().toLocaleString('es-ES')}
    `;

    // Aquí implementarías el envío real
    console.log('Email que se enviaría:', emailContent);
    
    return true;
  } catch (error) {
    console.error('Error enviando email:', error);
    return false;
  }
}
