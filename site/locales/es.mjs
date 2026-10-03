// Versión en español (C-LAUNCH-1). Español neutro, tuteo, sin «vosotros».
// ¿ ¡ al inicio de preguntas y exclamaciones; comillas «…».
// El programa todavía está en inglés, por eso el botón se llama «Start».

export default {
  code: 'es',
  htmlLang: 'es',
  hreflang: 'es',
  ogLocale: 'es_ES',
  nativeName: 'Español',
  appInLanguage: false,
  siteName: 'Entrenador de lectura musical',
  meta: {
    title: 'Entrenador de lectura musical: lee partituras en tu piano digital',
    description:
      'Un entrenador gratuito de lectura a primera vista. Conecta tu piano digital por cable a una tableta, un teléfono o una computadora y toca: notas en el pentagrama, comprobadas al instante. Sin registro, funciona sin conexión.',
  },
  language: 'Idioma',
  close: 'Cerrar',
  langHint: 'Esta página está disponible en español',
  hero: {
    title: 'Lee música con fluidez',
    lead: 'Un entrenador de lectura a primera vista para piano digital. Conéctalo por cable a una tableta, un teléfono o una computadora, y toca.',
    cta: 'Abrir el entrenador',
    free: 'Gratis. Sin registro.',
  },
  method: {
    title: 'Lee por frases, no nota por nota',
    alt: 'Pentagrama del entrenador: nota de referencia C4 y flechas de intervalo sobre las notas siguientes',
    modes: [
      {
        name: 'Secuencias',
        text: 'Encuentra la primera nota a partir de una nota de referencia y sigue por intervalos. Las pistas desaparecen cuando aciertas.',
      },
      {
        name: 'Contorno',
        text: 'Toca la forma de la melodía —sube, baja, se repite— desde cualquier tecla.',
      },
      { name: 'Ritmo', text: 'Marca el ritmo en cualquier tecla.' },
    ],
    adaptive:
      'Los pasajes difíciles aparecen más a menudo y, al final de cada sesión, ves qué ha mejorado.',
  },
  see: {
    title: 'Grande. A tu ritmo.',
    correct: 'Correcto: círculo continuo',
    wrong: 'Fallo: círculo discontinuo',
    lines: [
      'Notas grandes y buen contraste, para quien lee con dificultad la letra pequeña.',
      'Sin cuenta atrás ni «suspenso»: tu velocidad se mide en silencio.',
      '¿No tienes un piano a mano? Toca en el teclado de la pantalla.',
    ],
  },
  begin: {
    title: 'Conecta el piano y toca',
    stepsLabel: 'Cómo empezar',
    steps: [
      'Conecta el piano a tu dispositivo con un cable USB.',
      'Abre el entrenador en Chrome.',
      'Permite el acceso al piano.',
      'Pulsa «Start».',
    ],
    needTitle: 'Qué necesitas',
    need: 'Un piano digital con USB. Una tableta o un teléfono Android (con adaptador OTG si el conector no encaja) o una computadora con Windows, macOS o Linux. Chrome o Edge.',
    ios: 'No funciona en iPhone ni iPad: Safari no tiene acceso al piano. Puedes probar el teclado de la pantalla en cualquier dispositivo.',
    honestTitle: 'Con franqueza',
    honest: [
      'Después de la primera visita, el entrenador funciona sin conexión.',
      'El entrenador no recopila nada: tu progreso se queda en tu dispositivo.',
      'Este sitio cuenta las visitas; más información en «Privacidad».',
    ],
    appEnglish: 'Por ahora, el entrenador está en inglés.',
    unsupported: 'Este navegador no puede trabajar con el piano. Abre el sitio en Chrome.',
  },
  footer: {
    email: 'Correo',
    privacy: 'Privacidad',
    counter: 'Contador de visitas',
    version: 'Versión',
  },
  consent: {
    text: 'Este sitio cuenta las visitas con Yandex Metrica. ¿Estás de acuerdo?',
    yes: 'Acepto',
    no: 'No',
    more: 'Más información',
  },
  privacy: {
    title: 'Privacidad',
    back: 'Volver a la página principal',
    paragraphs: [
      'El entrenador no envía nada: tus ajustes y tu progreso se guardan solo en el navegador de tu dispositivo.',
      'Este sitio cuenta las visitas con Yandex Metrica, un servicio de Yandex. El contador solo se activa si pulsas «Acepto».',
      'Qué ve Metrica: qué páginas se abren, de dónde vienes, tu dispositivo y navegador, la ciudad aproximada según la dirección IP, los clics y el desplazamiento. La grabación de sesiones (Webvisor) registra las acciones en la página, pero aquí no hay nada que escribir: el sitio no tiene formularios. Yandex guarda los datos según sus condiciones de uso de Metrica.',
      'Cómo negarte: pulsa «Contador de visitas» al pie de la página y elige «No». También puedes bloquear las cookies en la configuración del navegador.',
    ],
    termsLink: 'Condiciones de uso de Yandex Metrica',
    termsUrl: 'https://yandex.com/legal/metrica_termsofuse/',
  },
}
