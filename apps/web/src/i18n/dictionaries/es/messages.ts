import type { enMessages } from '../en/messages';

export const esMessages: Record<keyof typeof enMessages, string> = {
  // ─── Bandeja de entrada ─────────────────────────────────────────────────
  'messages.title': 'Mensajes',
  'messages.subtitle': 'Conversaciones con contratistas e hilos de trabajos',
  'messages.searchPlaceholder': 'Buscar conversaciones...',
  'messages.tab.direct': 'Mensajes directos',
  'messages.tab.jobs': 'Mensajes de trabajos',
  'messages.dm.empty.title': 'No tienes mensajes directos',
  'messages.dm.empty.desc': 'Inicia una conversación visitando el perfil de un contratista y tocando "Enviar mensaje".',
  'messages.job.empty.title': 'No tienes conversaciones de trabajos',
  'messages.job.empty.desc': 'Los mensajes aparecerán aquí cuando te comuniques sobre un trabajo.',
  'messages.empty.search': 'Ninguna conversación coincide con tu búsqueda.',
  'messages.unknownUser': 'Desconocido',
  'messages.youPrefix': 'Tú: ',

  // ─── Hilo de mensajes directos ──────────────────────────────────────────
  'dm.userNotFound': 'Usuario no encontrado',
  'dm.backToMessages': 'Volver a mensajes',
  'dm.startConversation': 'Inicia una conversación con {name}',
  'dm.typing': '{name} está escribiendo...',
  'dm.inputPlaceholder': 'Escríbele a {name}...',
  'dm.sendFailed': 'No se pudo enviar el mensaje',
  'dm.react': 'Reaccionar',
  'dm.report': 'Reportar',
  'dm.report.title': 'Reportar mensaje',
  'dm.report.body': 'Este reporte se enviará a los administradores de Tradelink para su revisión. Describe el problema.',
  'dm.report.placeholder': 'Describe por qué estás reportando este mensaje...',
  'dm.report.submit': 'Enviar reporte',
};
