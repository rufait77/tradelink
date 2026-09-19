import type { enCommon } from '../en/common';

// Neutral Latin-American Spanish. "Tradelink" is never translated.
export const esCommon: Record<keyof typeof enCommon, string> = {
  // ─── Acciones / palabras generales ──────────────────────────────────────
  'common.save': 'Guardar',
  'common.saving': 'Guardando...',
  'common.cancel': 'Cancelar',
  'common.close': 'Cerrar',
  'common.back': 'Atrás',
  'common.next': 'Siguiente',
  'common.continue': 'Continuar',
  'common.submit': 'Enviar',
  'common.submitting': 'Enviando...',
  'common.confirm': 'Confirmar',
  'common.delete': 'Eliminar',
  'common.edit': 'Editar',
  'common.send': 'Enviar',
  'common.sending': 'Enviando...',
  'common.loading': 'Cargando...',
  'common.search': 'Buscar',
  'common.filter': 'Filtrar',
  'common.clear': 'Limpiar',
  'common.viewAll': 'Ver todo',
  'common.viewDetails': 'Ver detalles',
  'common.optional': 'Opcional',
  'common.required': 'Obligatorio',
  'common.yes': 'Sí',
  'common.no': 'No',
  'common.of': 'de',
  'common.page': 'Página',
  'common.previous': 'Anterior',
  'common.retry': 'Intentar de nuevo',
  'common.copied': 'Copiado al portapapeles',
  'common.na': 'N/D',
  'common.none': 'Ninguno',
  'common.all': 'Todos',
  'common.and': 'y',
  'common.perMonth': '/mes',
  'common.oneTime': 'pago único',

  // ─── Tiempo relativo ────────────────────────────────────────────────────
  'time.justNow': 'hace un momento',
  'time.minutesAgo': 'hace {count} min',
  'time.hoursAgo': 'hace {count} h',
  'time.daysAgo': 'hace {count} d',
  'time.hoursLeft': 'faltan {count} h',
  'time.minutesLeft': 'faltan {count} min',
  'time.expired': 'Vencido',

  // ─── Selector de idioma ─────────────────────────────────────────────────
  'language.label': 'Idioma',
  'language.change': 'Cambiar idioma',

  // ─── Barra de navegación pública ────────────────────────────────────────
  'nav.home': 'Inicio',
  'nav.howItWorks': 'Cómo funciona',
  'nav.pricing': 'Precios',
  'nav.contact': 'Contacto',
  'nav.dashboard': 'Panel',
  'nav.login': 'Iniciar sesión',
  'nav.getStarted': 'Comenzar',
  'nav.openMenu': 'Abrir menú',
  'nav.closeMenu': 'Cerrar menú',

  // ─── Pie de página ──────────────────────────────────────────────────────
  'footer.tagline': 'La plataforma de referidos para contratistas que sí paga. Gana {pct}% de comisión por cada trabajo completado que refieras.',
  'footer.group.product': 'Producto',
  'footer.group.company': 'Empresa',
  'footer.group.trades': 'Oficios',
  'footer.link.howItWorks': 'Cómo funciona',
  'footer.link.pricing': 'Precios',
  'footer.link.getStarted': 'Comenzar',
  'footer.link.contact': 'Contacto',
  'footer.link.terms': 'Términos del servicio',
  'footer.link.privacy': 'Política de privacidad',
  'footer.copyright': '© {year} Tradelink. Todos los derechos reservados.',
  'footer.builtBy': 'Creado por',

  // ─── Barra lateral del panel ────────────────────────────────────────────
  'sidebar.dashboard': 'Panel',
  'sidebar.jobBoard': 'Tablero de trabajos',
  'sidebar.postReferral': 'Publicar un referido',
  'sidebar.myReferrals': 'Mis referidos',
  'sidebar.myJobs': 'Mis trabajos',
  'sidebar.earnings': 'Ganancias',
  'sidebar.messages': 'Mensajes',
  'sidebar.notifications': 'Notificaciones',
  'sidebar.profile': 'Perfil',
  'sidebar.billing': 'Facturación',
  'sidebar.settings': 'Configuración',
  'sidebar.signOut': 'Cerrar sesión',

  // ─── Barra superior del panel ───────────────────────────────────────────
  'topbar.welcomeBack': 'Bienvenido de nuevo,',
  'topbar.notifications': 'Notificaciones',
  'topbar.yourProfile': 'Tu perfil',

  // ─── Portal del cliente ─────────────────────────────────────────────────
  'clientPortal.badge': 'Portal del cliente',

  // ─── Panel lateral de autenticación ─────────────────────────────────────
  'authLayout.titleLead': 'Convierte cada contacto en',
  'authLayout.titleAccent': 'ingresos pasivos',
  'authLayout.subtitle': 'La plataforma de referidos para contratistas que te paga {pct}% de comisión por cada trabajo completado.',
  'authLayout.stat.commission': 'Comisión',
  'authLayout.stat.signupFee': 'Cuota de registro',
  'authLayout.stat.tradeTypes': 'Tipos de oficio',

  // ─── Componentes de interfaz ────────────────────────────────────────────
  'ui.select.placeholder': 'Seleccionar...',
  'ui.emptyState.title': 'Todavía no hay nada aquí',

  // ─── Páginas de error ───────────────────────────────────────────────────
  'notFound.heading': 'Página no encontrada',
  'notFound.body': 'La página que buscas no existe o fue movida.',
  'notFound.cta': 'Volver al inicio',
  'errorPage.heading': 'Algo salió mal',
  'errorPage.body': 'Ocurrió un error inesperado. Por favor, inténtalo de nuevo.',
  'errorPage.cta': 'Intentar de nuevo',

  // ─── Tipos de oficio ────────────────────────────────────────────────────
  'trade.Landscaping': 'Jardinería y paisajismo',
  'trade.Roofing': 'Techos',
  'trade.HVAC': 'Climatización (HVAC)',
  'trade.Plumbing': 'Plomería',
  'trade.Electrical': 'Electricidad',
  'trade.Painting': 'Pintura',
  'trade.Carpentry': 'Carpintería',
  'trade.Flooring': 'Pisos',
  'trade.Masonry': 'Albañilería',
  'trade.Cleaning': 'Limpieza',
  'trade.PressureWashing': 'Lavado a presión',
  'trade.JunkRemoval': 'Retiro de escombros',
  'trade.WindowInstallation': 'Instalación de ventanas',
  'trade.Siding': 'Revestimiento exterior',
  'trade.Clearing': 'Desmonte de terrenos',
  'trade.GeneralContracting': 'Contratación general',
  'trade.Welding': 'Soldadura',
  'trade.Drywall': 'Tablaroca',
  'trade.Barber': 'Barbería',
  'trade.Cosmetology': 'Cosmetología',
  'trade.Esthetician': 'Esteticista',
  'trade.AutoMechanics': 'Mecánica automotriz',
  'trade.Other': 'Otro',

  // ─── Estados del trabajo ────────────────────────────────────────────────
  'status.Open': 'Abierto',
  'status.InterestClosed': 'Postulaciones cerradas',
  'status.Assigned': 'Asignado',
  'status.QuoteSent': 'Cotización enviada',
  'status.QuoteApproved': 'Cotización aprobada',
  'status.EscrowFunded': 'Depósito en garantía',
  'status.InProgress': 'En curso',
  'status.ContractorDone': 'Contratista terminó',
  'status.ClientConfirmed': 'Cliente confirmó',
  'status.Completed': 'Completado',
  'status.Disputed': 'En disputa',
  'status.Cancelled': 'Cancelado',
  'status.Expired': 'Vencido',

  // ─── Urgencia ───────────────────────────────────────────────────────────
  'urgency.Low': 'Baja',
  'urgency.Medium': 'Media',
  'urgency.High': 'Alta',
  'urgency.Emergency': 'Emergencia',

  // ─── Estado del depósito en garantía ────────────────────────────────────
  'escrowStatus.pending': 'Pendiente',
  'escrowStatus.funded': 'Depositado',
  'escrowStatus.released': 'Liberado',
  'escrowStatus.refunded': 'Reembolsado',
  'escrowStatus.disputed': 'En disputa',

  // ─── Roles ──────────────────────────────────────────────────────────────
  'role.contractor': 'Contratista',
  'role.referrer': 'Referidor',

  // ─── Códigos de error de la API ─────────────────────────────────────────
  'apiError.generic': 'Algo salió mal. Por favor, inténtalo de nuevo.',
  'apiError.network': 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
  'apiError.INVALID_CREDENTIALS': 'Correo electrónico o contraseña incorrectos.',
  'apiError.EMAIL_EXISTS': 'Ya existe una cuenta con ese correo electrónico.',
  'apiError.EMAIL_NOT_VERIFIED': 'Verifica tu correo electrónico antes de iniciar sesión.',
  'apiError.UNAUTHORIZED': 'Tu sesión expiró. Por favor, inicia sesión de nuevo.',
  'apiError.FORBIDDEN': 'No tienes permiso para hacer eso.',
  'apiError.NOT_FOUND': 'No pudimos encontrar lo que buscabas.',
  'apiError.VALIDATION_ERROR': 'Revisa el formulario e inténtalo de nuevo.',
  'apiError.SUBSCRIPTION_REQUIRED': 'Se requiere una suscripción activa para esta acción.',
  'apiError.REFERRER_NOT_ALLOWED': 'Las cuentas de referidor no pueden tomar trabajos ni enviar cotizaciones.',
  'apiError.RATE_LIMITED': 'Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.',
  'apiError.PAYMENT_FAILED': 'No se pudo procesar el pago. Intenta con otra tarjeta.',
  'apiError.INVALID_TOKEN': 'Este enlace no es válido o ya expiró.',
};
