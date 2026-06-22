// Static defaults mirroring the public website's data/*.json fallback files.
// Used to seed the database when admin sections are empty.

export const HOME_DEFAULTS = {
  hero: {
    title: "Primeo, la plateforme de confiance pour vos réservations d'hébergement, de services immobiliers et de restauration en Côte d'Ivoire",
    subtitle: "Réservez facilement avec 3 options de paiement, visitez les lieux en 3D, et gérez vos biens sans commission.",
    buttonText: "Télécharger l'application",
    buttonUrl: '#',
  },
  mission: {
    text: "Primeo réinvente la réservation d'hébergement en Afrique francophone avec une approche locale, flexible et transparente. Pas de commission cachée, paiement adapté à vos habitudes.",
  },
  solutions_preview: [
    { title: 'Voyageurs', summary: "Trouvez et réservez facilement votre hébergement idéal en Côte d'Ivoire. Comparez les prix, lisez les avis, payez comme vous le souhaitez.", icon: '✈️', link: '/solutions/' },
    { title: "Professionnels de l'hébergement", summary: "Publiez vos annonces, gérez vos réservations et boostez votre visibilité. Accédez à des outils professionnels pensés pour les hôteliers ivoiriens.", icon: '🏨', link: '/solutions/' },
    { title: 'Restaurateurs & Immobilier', summary: "Gérez votre restaurant en ligne, acceptez des réservations de tables et publiez vos offres immobilières sur une seule et même plateforme.", icon: '🍽️', link: '/solutions/' },
  ],
  products_preview: [
    { title: "Formules d'abonnement", description: "Choisissez la formule adaptée à votre activité — Starter, Business ou Entreprise. Commencez gratuitement et évoluez selon vos besoins.", badge: null, link: '/produits/' },
    { title: "Boosts d'annonce", description: "Propulsez vos annonces en tête des résultats. Les boosts sont disponibles à la carte et leur effet est immédiat.", badge: 'Populaire', link: '/produits/' },
    { title: 'Visite 3D', description: "Offrez à vos clients une immersion virtuelle de votre bien. Les visites 3D augmentent les taux de conversion de 40%.", badge: 'Nouveau', link: '/produits/' },
  ],
  why: [
    { title: 'Confiance',    icon: '🛡️', description: "Chaque professionnel est vérifié et chaque paiement sécurisé. Nous garantissons une expérience fiable pour tous." },
    { title: 'Flexibilité', icon: '🔄', description: "Paiement intégral, acompte ou à l'arrivée — choisissez le mode qui vous convient. Primeo s'adapte à vos habitudes." },
    { title: 'Innovation',  icon: '🚀', description: "Visites 3D, paiement mobile, gestion temps réel : Primeo intègre les technologies les plus récentes pour votre confort." },
    { title: 'Local',       icon: '🌍', description: "Conçu par des Ivoiriens pour le marché ivoirien. Nous comprenons vos besoins et parlons votre langue." },
  ],
  testimonials: [
    { name: 'Ama Konan',          rating: 5, text: "Primeo m'a permis de trouver un appartement meublé à Cocody en moins de 24h. Le processus de réservation est ultra-simple." },
    { name: 'Jean-Baptiste Koffi', rating: 5, text: "Grâce aux boosts, mes annonces reçoivent 3 fois plus de vues. Mon taux d'occupation est passé de 60% à 90% en un mois !" },
    { name: 'Marie Touré',         rating: 4, text: "Excellent service client et interface très intuitive. Je recommande Primeo à tous les propriétaires qui veulent gagner du temps." },
    { name: 'David Assi',          rating: 5, text: "La visite 3D est une révolution ! Mes clients réservent maintenant sans même avoir visité physiquement. Incroyable gain de temps." },
  ],
};

export const SOLUTIONS_DEFAULTS = {
  intro: { headline: "Une offre adaptée à chaque usage", subtext: "Que vous soyez voyageur, professionnel de l'hébergement, restaurateur ou agent immobilier, Primeo s'adapte à vos besoins." },
  blocs: [
    {
      icon: '✈️', title: 'Pour les Voyageurs', subtitle: 'Trouvez et réservez votre hébergement idéal',
      description: "Explorez des centaines d'hébergements vérifiés à Abidjan et partout en Côte d'Ivoire. Comparez les prix, lisez les avis authentiques, payez à votre convenance et vivez des séjours mémorables.",
      features: [
        { icon: '🔍', text: 'Recherche avancée par quartier, prix et type' },
        { icon: '🏅', text: 'Hébergements vérifiés et notés' },
        { icon: '💳', text: 'Paiement intégral, acompte ou sur place' },
        { icon: '🔭', text: 'Visites virtuelles 360° avant réservation' },
        { icon: '📱', text: 'Application mobile intuitive' },
        { icon: '🛡️', text: 'Garantie remboursement en cas de litige' },
      ],
      ctaLabel: 'Explorer les hébergements', ctaUrl: '/mobile',
    },
    {
      icon: '🏨', title: 'Hôteliers & Propriétaires', subtitle: "Maximisez votre taux d'occupation",
      description: "Publiez vos annonces en quelques minutes, gérez vos réservations en temps réel et augmentez votre visibilité grâce aux boosts d'annonces. Primeo vous donne tous les outils pour développer votre activité.",
      features: [
        { icon: '📋', text: 'Tableau de bord de gestion complet' },
        { icon: '📅', text: 'Calendrier de disponibilités en temps réel' },
        { icon: '🚀', text: 'Boosts pour propulser vos annonces' },
        { icon: '📊', text: 'Statistiques de performance détaillées' },
        { icon: '💬', text: 'Messagerie intégrée avec les clients' },
        { icon: '🔭', text: 'Outil de création de visite 3D' },
      ],
      ctaLabel: 'Devenir partenaire', ctaUrl: '/mobile',
    },
    {
      icon: '🍽️', title: 'Restaurateurs', subtitle: 'Développez votre restaurant en ligne',
      description: "Acceptez des réservations de tables en ligne, gérez votre carte, publiez des offres spéciales et touchez une nouvelle clientèle. Primeo connecte votre restaurant aux gourmands d'Abidjan et d'ailleurs.",
      features: [
        { icon: '📅', text: 'Réservations de tables en ligne 24h/24' },
        { icon: '🍴', text: 'Gestion de la carte et des menus' },
        { icon: '🎉', text: 'Promotions et offres spéciales ciblées' },
        { icon: '⭐', text: "Collecte d'avis clients vérifiés" },
        { icon: '📍', text: 'Référencement local optimisé' },
        { icon: '📊', text: "Analyse des couverts et du chiffre d'affaires" },
      ],
      ctaLabel: 'Référencer mon restaurant', ctaUrl: '/mobile',
    },
    {
      icon: '🏗️', title: "Professionnels de l'Immobilier", subtitle: 'Publiez et gérez vos offres immobilières',
      description: "Que vous soyez agent, promoteur ou particulier, Primeo vous permet de publier vos annonces de vente et de location avec photos HD, visites virtuelles et outils de suivi de prospects.",
      features: [
        { icon: '🏠', text: 'Annonces vente et location illimitées' },
        { icon: '📷', text: 'Photos HD et visites virtuelles 3D' },
        { icon: '👥', text: 'Suivi des prospects et des demandes' },
        { icon: '📝', text: 'Signature électronique des contrats' },
        { icon: '📣', text: 'Campagnes de boost ciblées' },
        { icon: '🌍', text: 'Visibilité nationale et internationale' },
      ],
      ctaLabel: 'Publier une annonce', ctaUrl: '/mobile',
    },
  ],
};

export const PRODUCTS_DEFAULTS = {
  intro: {
    title: 'Des produits conçus pour votre réussite',
    paragraph: "Primeo propose une gamme complète de produits adaptés à la taille et aux objectifs de chaque professionnel — que vous débutiez ou gériez un portefeuille de biens important. Choisissez la formule qui vous correspond et évoluez à votre rythme.",
  },
  plans: [
    { id: 'starter',    slug: 'starter',    name: 'Starter',    price: 'Gratuit', badge: null,         highlighted: false, ctaLabel: 'Choisir Starter',       ctaUrl: '/contact/' },
    { id: 'business',   slug: 'business',   name: 'Business',   price: '9 000',   badge: 'Populaire',  highlighted: false, ctaLabel: 'Choisir Business',      ctaUrl: '/contact/' },
    { id: 'entreprise', slug: 'entreprise', name: 'Entreprise', price: '24 000',  badge: 'Best Value', highlighted: true,  ctaLabel: 'Souscrire Entreprise', ctaUrl: '/contact/' },
  ],
  rows: [
    { feature: 'Commission par réservation',    highlight: true,  starter: '0 %',       business: '0 %',       entreprise: '0 %' },
    { feature: 'Publications incluses',          highlight: false, starter: '3',          business: '10',        entreprise: '40 (∞ resto)' },
    { feature: 'Badge Profil Vérifié',          highlight: false, starter: '✗',          business: '✓',         entreprise: '✗' },
    { feature: 'Badge Hôte Premium',            highlight: false, starter: '✗',          business: '✗',         entreprise: '✓' },
    { feature: 'Visibilité dans les résultats', highlight: false, starter: 'Standard',   business: '+30 %',     entreprise: 'Prioritaire' },
    { feature: 'Boosts gratuits / mois',        highlight: false, starter: '0',          business: '2',         entreprise: '7' },
    { feature: 'Support',                       highlight: false, starter: 'Email',      business: 'Prioritaire', entreprise: 'VIP' },
    { feature: 'Multi-utilisateurs',            highlight: false, starter: '✗',          business: '✗',         entreprise: '✓' },
    { feature: 'Vidéo dans les annonces',       highlight: false, starter: '✗',          business: '✓',         entreprise: '✓' },
    { feature: 'Visite 3D',                     highlight: false, starter: '✗',          business: '✗',         entreprise: '✓' },
    { feature: 'Statistiques',                  highlight: false, starter: 'Non',        business: 'Avancées',  entreprise: 'Expert' },
  ],
  boost: {
    title: "Boosts d'annonce — Augmentez votre visibilité instantanément",
    description: "Pour seulement 2 000 FCFA, votre annonce est mise en avant pendant 72 heures en tête des résultats de recherche. Observez immédiatement l'effet sur vos vues et vos demandes de réservation.",
    price: 2000, duration: 72, ctaLabel: 'En savoir plus', ctaUrl: '/contact/',
  },
  ads: {
    title: 'Publicité ciblée — Faites connaître votre entreprise',
    description: "Touchez des milliers d'utilisateurs actifs sur la plateforme Primeo. Nos espaces publicitaires permettent aux marques, prestataires et services de gagner en visibilité auprès d'une audience qualifiée en Côte d'Ivoire.",
    formats: ['Bannières in-app', 'Notifications sponsorisées', 'Newsletter mensuelle', 'Encarts sur le site vitrine'],
    ctaLabel: 'Demander un devis', ctaUrl: '/contact/',
  },
  dataPacks: [
    { icon: '📈', title: 'Pack Market Trends', description: 'Prix moyens par ville et quartier, évolution mensuelle des tarifs, saisonnalité de la demande.', price: 25000, ctaLabel: 'Acheter ce rapport', ctaUrl: '/contact/' },
    { icon: '🏆', title: 'Pack Performance', description: "Taux d'occupation comparé à la concurrence, analyse de votre positionnement prix, recommandations tarifaires.", price: 40000, ctaLabel: 'Acheter ce rapport', ctaUrl: '/contact/' },
    { icon: '👥', title: 'Pack Client Insights', description: "Origines géographiques des clients, durée de séjour moyenne, préférences de paiement, profil démographique.", price: 35000, ctaLabel: 'Acheter ce rapport', ctaUrl: '/contact/' },
  ],
  upcoming: [
    { icon: '🛡️', title: 'Assurance voyage',      description: 'Protection couvrant annulations et incidents pour voyageurs et hôtes.' },
    { icon: '🤵', title: 'Conciergerie Primeo',   description: 'Service de conciergerie premium pour une gestion déléguée de vos propriétés.' },
    { icon: '🤝', title: 'Programme partenaires', description: 'Réseau de services locaux : ménage, maintenance, transferts aéroport.' },
    { icon: '💱', title: 'Paiement multi-devises', description: 'Acceptez XOF, EUR et USD pour attirer les voyageurs internationaux.' },
  ],
};

export const ABOUT_DEFAULTS = {
  history: {
    title: 'Notre histoire',
    content: `<p>Fondée à Abidjan en 2022 par une équipe passionnée d'hospitalité et de technologie, Primeo est née d'un constat simple : la réservation d'hébergement en Côte d'Ivoire manquait de transparence, de confiance et d'outils adaptés aux réalités locales.</p>
<h2>2022 — Création</h2><p>Fondée à Abidjan par une équipe passionnée d'hospitalité et de technologie.</p>
<h2>2023 — Lancement</h2><p>Ouverture au public avec plus de 1 000 utilisateurs inscrits dès le premier mois.</p>
<h2>2024 — Paiement mobile</h2><p>Intégration d'Orange Money, MTN MoMo et Wave pour des réservations payées en quelques secondes.</p>
<h2>2025 — Expansion régionale</h2><p>Extension du service à 14 villes et lancement des boosts d'annonce et de la visite 3D immersive.</p>`,
  },
  mission: {
    title: 'Notre mission',
    content: "Rendre la réservation d'hébergement, de restaurant et la mise en relation immobilière accessibles, transparentes et fiables pour tous les Ivoiriens, en donnant à chacun les outils pour réserver et gérer en toute sérénité.",
  },
  values: [
    { icon: '🎯', title: 'Impact réel',         description: "Chaque fonctionnalité est conçue pour avoir un impact mesurable sur la vie de nos utilisateurs." },
    { icon: '🔍', title: 'Transparence',        description: "Nous croyons en la clarté : données claires, tarifs lisibles, zéro frais cachés." },
    { icon: '🌍', title: 'Ancrage local',       description: "Conçu en Côte d'Ivoire, pour les réalités africaines — accessibilité, mobile-first, langues locales." },
    { icon: '🚀', title: 'Innovation continue', description: "Nous itérons constamment pour offrir la meilleure expérience possible à nos utilisateurs." },
    { icon: '🤝', title: 'Partenariat',         description: "Nous travaillons main dans la main avec les hôtes, restaurateurs et agents immobiliers pour construire ensemble." },
    { icon: '🔒', title: 'Confiance',           description: "La sécurité et la confidentialité des données de nos utilisateurs sont non négociables." },
  ],
  team: [
    { name: 'Kouassi Abo',    role: 'CEO & Co-fondateur',   bio: "Expert du secteur hôtelier et touristique, 10 ans d'expérience dans l'hospitalité en Côte d'Ivoire." },
    { name: 'Aïssatou Fall',  role: 'CTO & Co-fondatrice',  bio: 'Développeuse full-stack, ancienne ingénieure chez Orange CI.' },
    { name: 'Moussa Yao',     role: 'Directeur Commercial', bio: 'Spécialiste en développement des affaires B2B et partenariats stratégiques.' },
    { name: 'Sylvie Brou',    role: 'Responsable Produit',  bio: 'UX designer et chef de produit, passionnée par les interfaces inclusives.' },
  ],
};

export const FAQ_DEFAULTS = [
  { category: 'Général', question: "Qu'est-ce que Primeo ?", answer: "<p>Primeo est une plateforme de réservation d'hébergement et de mise en relation dédiée aux voyageurs et aux professionnels en Côte d'Ivoire.</p>", order: 1 },
  { category: 'Général', question: 'Comment créer un compte Primeo ?', answer: "<p>Rendez-vous sur app.primeo.ci/signup et renseignez votre adresse e-mail, votre numéro de téléphone et créez un mot de passe sécurisé.</p>", order: 2 },
  { category: 'Général', question: "Primeo est-il disponible partout en Côte d'Ivoire ?", answer: "<p>Oui, Primeo est accessible sur l'ensemble du territoire ivoirien. L'offre s'enrichit progressivement, en commençant par Abidjan et les grandes agglomérations.</p>", order: 3 },
  { category: 'Abonnements & Paiements', question: 'Quels sont les modes de paiement acceptés ?', answer: "<p>Nous acceptons : Mobile Money (Orange Money, MTN MoMo, Wave), Carte bancaire (Visa, Mastercard), et Virement bancaire pour les abonnements annuels.</p>", order: 1 },
  { category: 'Abonnements & Paiements', question: "Puis-je annuler mon abonnement à tout moment ?", answer: "<p>Oui, vous pouvez résilier depuis votre espace client (Paramètres → Abonnement → Résilier). La résiliation prend effet à la fin de la période en cours.</p>", order: 2 },
  { category: 'Compte & Sécurité', question: "J'ai oublié mon mot de passe, que faire ?", answer: "<p>Cliquez sur \"Mot de passe oublié ?\" sur la page de connexion. Vous recevrez un lien de réinitialisation valable 30 minutes.</p>", order: 1 },
  { category: 'Compte & Sécurité', question: "Comment activer la double authentification ?", answer: "<p>Dans votre espace client, accédez à Paramètres → Sécurité → Authentification à deux facteurs.</p>", order: 2 },
  { category: 'Application Mobile', question: "L'application Primeo est-elle disponible sur Android et iOS ?", answer: "<p>Oui, l'application est disponible sur Google Play Store et Apple App Store.</p>", order: 1 },
];
