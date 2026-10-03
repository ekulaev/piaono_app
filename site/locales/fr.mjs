// Version française (C-LAUNCH-1). Vouvoiement.
// Typographie : espace insécable ( ) avant « : » et à l’intérieur des guillemets « » ;
// espace fine insécable ( ) avant ; ! ?
// L’application est encore en anglais : le bouton s’appelle « Start ».

export default {
  code: 'fr',
  htmlLang: 'fr',
  hreflang: 'fr',
  ogLocale: 'fr_FR',
  nativeName: 'Français',
  appInLanguage: false,
  siteName: 'Entraîneur de déchiffrage',
  meta: {
    title: 'Entraîneur de déchiffrage — lire la musique au piano numérique',
    description:
      'Un entraîneur gratuit pour le déchiffrage. Branchez votre piano numérique par câble à une tablette, un téléphone ou un ordinateur et jouez : les notes sur la portée, vérifiées aussitôt. Sans inscription, fonctionne hors ligne.',
  },
  language: 'Langue',
  close: 'Fermer',
  langHint: 'Cette page existe en français',
  hero: {
    title: 'Lisez la musique avec fluidité',
    lead: 'Un entraîneur de déchiffrage pour piano numérique. Branchez-le par câble à une tablette, un téléphone ou un ordinateur, et jouez.',
    cta: 'Ouvrir l’entraîneur',
    free: 'Gratuit. Sans inscription.',
  },
  method: {
    title: 'Lisez par phrases, pas note par note',
    alt: 'La portée de l’entraîneur : note repère C4 et flèches d’intervalle au-dessus des notes suivantes',
    modes: [
      {
        name: 'Séquences',
        text: 'Trouvez la première note à partir d’une note repère, puis avancez par intervalles. Les aides disparaissent quand vous réussissez.',
      },
      {
        name: 'Contour',
        text: 'Jouez la forme de la mélodie — elle monte, descend ou reste — depuis n’importe quelle touche.',
      },
      { name: 'Rythme', text: 'Tapez le rythme sur n’importe quelle touche.' },
    ],
    adaptive:
      'Les passages difficiles reviennent plus souvent, et à la fin de chaque séance vous voyez ce qui s’est amélioré.',
  },
  see: {
    title: 'En grand. À votre rythme.',
    correct: 'Juste : cercle plein',
    wrong: 'Raté : cercle en pointillés',
    lines: [
      'De grandes notes et un vrai contraste, pour ceux qui lisent mal les petits caractères.',
      'Ni compte à rebours ni « échec » : votre vitesse est mesurée discrètement.',
      'Pas de piano sous la main ? Jouez sur le clavier à l’écran.',
    ],
  },
  begin: {
    title: 'Branchez le piano et jouez',
    stepsLabel: 'Pour commencer',
    steps: [
      'Reliez le piano à votre appareil avec un câble USB.',
      'Ouvrez l’entraîneur dans Chrome.',
      'Autorisez l’accès au piano.',
      'Appuyez sur « Start ».',
    ],
    needTitle: 'Ce qu’il vous faut',
    need: 'Un piano numérique avec USB. Une tablette ou un téléphone Android (avec un adaptateur OTG si la prise ne correspond pas) ou un ordinateur sous Windows, macOS ou Linux. Chrome ou Edge.',
    ios: 'iPhone et iPad ne conviennent pas : Safari n’a pas accès au piano. Le clavier à l’écran s’essaie sur n’importe quel appareil.',
    honestTitle: 'En toute franchise',
    honest: [
      'Après la première ouverture, l’entraîneur fonctionne hors ligne.',
      'L’entraîneur ne collecte rien : votre progression reste sur votre appareil.',
      'Ce site compte les visites — voir « Confidentialité ».',
    ],
    appEnglish: 'L’entraîneur lui-même est pour l’instant en anglais.',
    unsupported: 'Ce navigateur ne peut pas communiquer avec le piano. Ouvrez le site dans Chrome.',
  },
  footer: {
    email: 'E-mail',
    privacy: 'Confidentialité',
    counter: 'Compteur de visites',
    version: 'Version',
  },
  consent: {
    text: 'Ce site compte les visites avec Yandex Metrica. Vous acceptez ?',
    yes: 'J’accepte',
    no: 'Non',
    more: 'En savoir plus',
  },
  privacy: {
    title: 'Confidentialité',
    back: 'Retour à l’accueil',
    paragraphs: [
      'L’entraîneur n’envoie rien : vos réglages et votre progression restent dans le navigateur de votre appareil.',
      'Ce site compte les visites avec Yandex Metrica, un service de Yandex. Le compteur ne démarre que si vous appuyez sur « J’accepte ».',
      'Ce que voit Metrica : les pages ouvertes, d’où vous venez, votre appareil et votre navigateur, la ville approximative d’après l’adresse IP, les clics et le défilement. L’enregistrement de session (Webvisor) note les actions sur la page, mais il n’y a rien à saisir ici : le site n’a aucun formulaire. Yandex conserve les données selon ses conditions d’utilisation de Metrica.',
      'Pour refuser : appuyez sur « Compteur de visites » en bas de la page et choisissez « Non ». Vous pouvez aussi bloquer les cookies dans les réglages du navigateur.',
    ],
    termsLink: 'Conditions d’utilisation de Yandex Metrica',
    termsUrl: 'https://yandex.com/legal/metrica_termsofuse/',
  },
}
