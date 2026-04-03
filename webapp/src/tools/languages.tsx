export const availableLanguages = ["EN", "ES", "FR", "DE", "PT", "ZH"] as const;

export type LanguageCode = (typeof availableLanguages)[number];

export interface Translations {
  // Welcome Page
  welcome: {
    badge: string;
    taglineQuote: string;
    taglineSub: string;
    featureAnyTopic: string;
    featureAnyTopicDesc: string;
    featureTrade: string;
    featureTradeDesc: string;
    featureEarn: string;
    featureEarnDesc: string;
    featureFast: string;
    featureFastDesc: string;
    featureSocial: string;
    featureSocialDesc: string;
    featureWeb3: string;
    featureWeb3Desc: string;
    connectButtonHint: string;
  };
  // GetStarted Page
  getStarted: {
    badge: string;
    taglineQuote: string;
    featureTradePredictions: string;
    featureRealtimeMarkets: string;
    featureAnyTopic: string;
    connectButtonHint: string;
    walletNotConnectedTitle: string;
    walletNotConnectedDesc: string;
  };
  // Navigation
  nav: {
    backToMarkets: string;
    back: string;
    previous: string;
    next: string;
    refresh: string;
    refreshing: string;
  };
  // My Thots Page
  myThots: {
    title: string;
    subtitle: string;
    marketCountSingular: string;
    marketCountPlural: string;
    pageOf: string;
    connectWalletTitle: string;
    connectWalletDesc: string;
    loadingThots: string;
    emptyStateTitle: string;
    emptyStateDesc: string;
    createFirstThotButton: string;
  };
  // Your Thots Page
  yourThots: {
    title: string;
    subtitle: string;
    marketCountSingular: string;
    marketCountPlural: string;
    pageOf: string;
    connectWalletTitle: string;
    connectWalletDesc: string;
    loadingMarkets: string;
    emptyStateTitle: string;
    emptyStateDesc: string;
    exploreMarketsButton: string;
  };
  // History Page
  history: {
    title: string;
    subtitle: string;
    totalClaims: string;
    totalEarned: string;
    marketsWon: string;
    avgPerClaim: string;
    connectWalletTitle: string;
    connectWalletDesc: string;
    loadingHistory: string;
    emptyStateTitle: string;
    emptyStateDesc: string;
    exploreMarketsButton: string;
    positionId: string;
    won: string;
    clickHint: string;
  };
  // Market Page
  market: {
    loadingMarket: string;
    marketNotFoundTitle: string;
    marketNotFoundButton: string;
    shareLinkCopied: string;
    shareLinkCopiedDesc: string;
    copyLinkFailed: string;
    copyLinkFailedDesc: string;
    shareFailed: string;
    shareFailedDesc: string;
    invalidNetwork: string;
    invalidNetworkDesc: string;
    walletNetworkMismatch: string;
    walletNetworkMismatchDesc: string;
    restoringWallet: string;
    restoringWalletDesc: string;
    claimSuccessful: string;
    claimFailed: string;
    noPositionsToClaim: string;
    kamikazeDisabled: string;
    kamikazeSuccessful: string;
    kamikazeFailed: string;
    noPositionsFound: string;
    allPositionsKamikazed: string;
    selectAtLeastOne: string;
  };
  // Vote Modal
  voteModal: {
    selectOption: string;
    enterAmount: string;
    voteSuccess: string;
    voteFailed: string;
    walletNotConnected: string;
    insufficientBalance: string;
    approvalRequired: string;
    approvalDesc: string;
    tokenApproved: string;
    proceedAnyway: string;
    connectToProceed: string;
  };
  // Create Market Modal
  createMarket: {
    detailsStep: string;
    confirmStep: string;
    marketTitle: string;
    marketSubtitle: string;
    marketDescription: string;
    posterImage: string;
    tags: string;
    optionAYes: string;
    optionBNo: string;
    marketBalance: string;
    endTime: string;
    endTimeError: string;
    forgoTimeButton: string;
    useToken: string;
    tokenAddress: string;
    tokenError: string;
    initialVote: string;
    createMarketButton: string;
    platformFee: string;
    imageRequired: string;
    invalidImageUrl: string;
  };
  // Common
  common: {
    yes: string;
    no: string;
    loading: string;
    cancel: string;
    submit: string;
    confirm: string;
    close: string;
    copy: string;
    share: string;
    connectWallet: string;
    disconnect: string;
    transactionCancelled: string;
    error: string;
  };
  // NotFound Page
  notFound: {
    message: string;
    returnHome: string;
  };
}

export const translations: Record<LanguageCode, Translations> = {
  EN: {
    // Welcome Page
    welcome: {
      badge: "Next Gen Prediction Market",
      taglineQuote: '"If you can think it, it\'s important."',
      taglineSub: "Trade predictions on any topic. Powered by blockchain.",
      featureAnyTopic: "Any Topic",
      featureAnyTopicDesc: "Create markets",
      featureTrade: "Trade",
      featureTradeDesc: "Yes or No",
      featureEarn: "Earn",
      featureEarnDesc: "Win rewards",
      featureFast: "Fast",
      featureFastDesc: "Instant settlement",
      featureSocial: "Social",
      featureSocialDesc: "Community driven",
      featureWeb3: "Web3",
      featureWeb3Desc: "Decentralized",
      connectButtonHint: "Connect your wallet or sign in to get started",
    },
    // GetStarted Page
    getStarted: {
      badge: "Next Gen Prediction Market",
      taglineQuote: '"If you can think it, it\'s important."',
      featureTradePredictions: "Trade Predictions",
      featureRealtimeMarkets: "Real-time Markets",
      featureAnyTopic: "Any Topic",
      connectButtonHint: "Connect your wallet to get started",
      walletNotConnectedTitle: "Wallet not connected",
      walletNotConnectedDesc: "Connect your wallet to participate. This message will disappear shortly.",
    },
    // Navigation
    nav: {
      backToMarkets: "Back to Markets",
      back: "Back",
      previous: "Previous",
      next: "Next",
      refresh: "Refresh",
      refreshing: "Refreshing...",
    },
    // My Thots Page
    myThots: {
      title: "My Thots",
      subtitle: "Markets you've created",
      marketCountSingular: "market",
      marketCountPlural: "markets",
      pageOf: "Page {current} of {total}",
      connectWalletTitle: "Connect Your Wallet",
      connectWalletDesc: "Connect your wallet to view the markets you've created.",
      loadingThots: "Loading your thots...",
      emptyStateTitle: "No Thots Yet",
      emptyStateDesc:
        "You haven't created any prediction markets yet. Start sharing your thots with the world!",
      createFirstThotButton: "Create Your First Thot",
    },
    // Your Thots Page
    yourThots: {
      title: "Your Thots",
      subtitle: "Markets you've voted on",
      marketCountSingular: "market",
      marketCountPlural: "markets",
      pageOf: "Page {current} of {total}",
      connectWalletTitle: "Connect Your Wallet",
      connectWalletDesc: "Connect your wallet to view the markets you've voted on.",
      loadingMarkets: "Loading your voted markets...",
      emptyStateTitle: "No Votes Yet",
      emptyStateDesc:
        "You haven't voted on any prediction markets yet. Explore markets and share your thots!",
      exploreMarketsButton: "Explore Markets",
    },
    // History Page
    history: {
      title: "Claim History",
      subtitle: "Your winning positions and rewards",
      totalClaims: "Total Claims",
      totalEarned: "Total Earned",
      marketsWon: "Markets Won",
      avgPerClaim: "Avg per Claim",
      connectWalletTitle: "Connect Your Wallet",
      connectWalletDesc: "Connect your wallet to view your claim history.",
      loadingHistory: "Loading your claim history...",
      emptyStateTitle: "No Claims Yet",
      emptyStateDesc:
        "You haven't claimed any winnings yet. Vote on markets and claim your rewards when they resolve!",
      exploreMarketsButton: "Explore Markets",
      positionId: "Position #{id}",
      won: "{label} won",
      clickHint: "Click to view market",
    },
    // Market Page
    market: {
      loadingMarket: "Loading market data...",
      marketNotFoundTitle: "Market not found",
      marketNotFoundButton: "Back to Markets",
      shareLinkCopied: "Share link copied",
      shareLinkCopiedDesc: "Market link includes the intended network.",
      copyLinkFailed: "Could not copy link",
      copyLinkFailedDesc: "Please copy the URL manually.",
      shareFailed: "Share failed",
      shareFailedDesc: "Try copying the link instead.",
      invalidNetwork: "Invalid market network in URL",
      invalidNetworkDesc: "Unsupported chainId={chainId}.",
      walletNetworkMismatch: "Wallet network mismatch",
      walletNetworkMismatchDesc: "Please reconnect and approve the requested network.",
      restoringWallet: "Restoring wallet...",
      restoringWalletDesc: "You can continue, but you may need to wait a moment before submitting.",
      claimSuccessful: "Claim successful!",
      claimFailed: "Claim failed",
      noPositionsToClaim: "No positions to claim",
      kamikazeDisabled: "Kamikaze is disabled for this market",
      kamikazeSuccessful: "Kamikaze successful",
      kamikazeFailed: "Kamikaze failed",
      noPositionsFound: "No positions found for this market",
      allPositionsKamikazed: "All listed positions are already kamikazed",
      selectAtLeastOne: "Select at least one position",
    },
    // Vote Modal
    voteModal: {
      selectOption: "Select your prediction",
      enterAmount: "Enter amount",
      voteSuccess: "Vote submitted successfully!",
      voteFailed: "Failed to submit vote",
      walletNotConnected: "Please connect your wallet first",
      insufficientBalance: "Insufficient token balance",
      approvalRequired: "Approval required",
      approvalDesc: "Approving token spending in your wallet",
      tokenApproved: "Token approved!",
      proceedAnyway: "You can continue, but you may need to wait a moment before submitting.",
      connectToProceed: "Connect your wallet to proceed",
    },
    // Create Market Modal
    createMarket: {
      detailsStep: "Market Details",
      confirmStep: "Confirm",
      marketTitle: "Market Title",
      marketSubtitle: "Subtitle",
      marketDescription: "Description",
      posterImage: "Poster Image URL",
      tags: "Tags",
      optionAYes: "Option A (Yes)",
      optionBNo: "Option B (No)",
      marketBalance: "Market Balance",
      endTime: "End Time",
      endTimeError: "End time must be at least 1 hour from now",
      forgoTimeButton: "Use Default (1.5 hours)",
      useToken: "Use Token Payment",
      tokenAddress: "Token Contract Address",
      tokenError: "Please enter a valid token address",
      initialVote: "Initial Vote",
      createMarketButton: "Create Market",
      platformFee: "Platform Fee",
      imageRequired: "Poster image URL is required",
      invalidImageUrl: "URL must end with a valid image extension (.jpg, .png, .gif, .webp, .svg)",
    },
    // Common
    common: {
      yes: "Yes",
      no: "No",
      loading: "Loading...",
      cancel: "Cancel",
      submit: "Submit",
      confirm: "Confirm",
      close: "Close",
      copy: "Copy",
      share: "Share",
      connectWallet: "Connect Wallet",
      disconnect: "Disconnect",
      transactionCancelled: "Transaction cancelled",
      error: "Error",
    },
    // NotFound Page
    notFound: {
      message: "Oops! Page not found",
      returnHome: "Return to Home",
    },
  },
  ES: {
    welcome: {
      badge: "Mercado de Predicción de Nueva Generación",
      taglineQuote: '"Si puedes pensarlo, es importante."',
      taglineSub: "Opera predicciones sobre cualquier tema. Impulsado por blockchain.",
      featureAnyTopic: "Cualquier Tema",
      featureAnyTopicDesc: "Crear mercados",
      featureTrade: "Operar",
      featureTradeDesc: "Sí o No",
      featureEarn: "Ganar",
      featureEarnDesc: "Recompensas",
      featureFast: "Rápido",
      featureFastDesc: "Liquidación instantánea",
      featureSocial: "Social",
      featureSocialDesc: "Comunidad",
      featureWeb3: "Web3",
      featureWeb3Desc: "Descentralizado",
      connectButtonHint: "Conecta tu wallet o inicia sesión",
    },
    getStarted: {
      badge: "Mercado de Predicción de Nueva Generación",
      taglineQuote: '"Si puedes pensarlo, es importante."',
      featureTradePredictions: "Operar predicciones",
      featureRealtimeMarkets: "Mercados en tiempo real",
      featureAnyTopic: "Cualquier tema",
      connectButtonHint: "Conecta tu wallet",
      walletNotConnectedTitle: "Wallet no conectada",
      walletNotConnectedDesc: "Conecta tu wallet para participar.",
    },
    nav: {
      backToMarkets: "Volver a mercados",
      back: "Atrás",
      previous: "Anterior",
      next: "Siguiente",
      refresh: "Actualizar",
      refreshing: "Actualizando...",
    },
    myThots: {
      title: "Mis Thots",
      subtitle: "Mercados que creaste",
      marketCountSingular: "mercado",
      marketCountPlural: "mercados",
      pageOf: "Página {current} de {total}",
      connectWalletTitle: "Conecta tu Wallet",
      connectWalletDesc: "Conecta tu wallet para ver tus mercados.",
      loadingThots: "Cargando tus thots...",
      emptyStateTitle: "Sin Thots",
      emptyStateDesc: "Aún no has creado mercados.",
      createFirstThotButton: "Crear tu primer Thot",
    },
    yourThots: {
      title: "Tus Thots",
      subtitle: "Mercados en los que votaste",
      marketCountSingular: "mercado",
      marketCountPlural: "mercados",
      pageOf: "Página {current} de {total}",
      connectWalletTitle: "Conecta tu Wallet",
      connectWalletDesc: "Conecta tu wallet para ver tus votos.",
      loadingMarkets: "Cargando mercados...",
      emptyStateTitle: "Sin votos",
      emptyStateDesc: "Aún no has votado.",
      exploreMarketsButton: "Explorar mercados",
    },
    history: {
      title: "Historial de Reclamaciones",
      subtitle: "Tus ganancias",
      totalClaims: "Reclamaciones",
      totalEarned: "Ganado",
      marketsWon: "Ganados",
      avgPerClaim: "Promedio",
      connectWalletTitle: "Conecta tu Wallet",
      connectWalletDesc: "Conecta tu wallet.",
      loadingHistory: "Cargando historial...",
      emptyStateTitle: "Sin reclamaciones",
      emptyStateDesc: "Aún no has reclamado.",
      exploreMarketsButton: "Explorar mercados",
      positionId: "Posición #{id}",
      won: "{label} ganó",
      clickHint: "Ver mercado",
    },
    market: {
      loadingMarket: "Cargando mercado...",
      marketNotFoundTitle: "Mercado no encontrado",
      marketNotFoundButton: "Volver",
      shareLinkCopied: "Enlace copiado",
      shareLinkCopiedDesc: "Incluye red",
      copyLinkFailed: "Error al copiar",
      copyLinkFailedDesc: "Copia manualmente",
      shareFailed: "Error al compartir",
      shareFailedDesc: "Intenta copiar",
      invalidNetwork: "Red inválida",
      invalidNetworkDesc: "chainId no soportado={chainId}",
      walletNetworkMismatch: "Red incorrecta",
      walletNetworkMismatchDesc: "Reconecta wallet",
      restoringWallet: "Restaurando wallet...",
      restoringWalletDesc: "Espera antes de enviar",
      claimSuccessful: "¡Reclamado!",
      claimFailed: "Error al reclamar",
      noPositionsToClaim: "Nada que reclamar",
      kamikazeDisabled: "Kamikaze desactivado",
      kamikazeSuccessful: "Kamikaze exitoso",
      kamikazeFailed: "Error kamikaze",
      noPositionsFound: "Sin posiciones",
      allPositionsKamikazed: "Todo ya kamikaze",
      selectAtLeastOne: "Selecciona uno",
    },
    voteModal: {
      selectOption: "Selecciona opción",
      enterAmount: "Ingresa monto",
      voteSuccess: "¡Voto enviado!",
      voteFailed: "Error al votar",
      walletNotConnected: "Conecta wallet",
      insufficientBalance: "Saldo insuficiente",
      approvalRequired: "Aprobación requerida",
      approvalDesc: "Aprobando tokens",
      tokenApproved: "¡Token aprobado!",
      proceedAnyway: "Puedes continuar",
      connectToProceed: "Conecta wallet",
    },
    createMarket: {
      detailsStep: "Detalles",
      confirmStep: "Confirmar",
      marketTitle: "Título",
      marketSubtitle: "Subtítulo",
      marketDescription: "Descripción",
      posterImage: "URL de imagen",
      tags: "Tags",
      optionAYes: "Opción A (Sí)",
      optionBNo: "Opción B (No)",
      marketBalance: "Balance",
      endTime: "Fin",
      endTimeError: "Debe ser +1h",
      forgoTimeButton: "Usar por defecto",
      useToken: "Usar token",
      tokenAddress: "Dirección",
      tokenError: "Dirección inválida",
      initialVote: "Voto inicial",
      createMarketButton: "Crear",
      platformFee: "Fee",
      imageRequired: "Imagen requerida",
      invalidImageUrl: "URL inválida",
    },
    common: {
      yes: "Sí",
      no: "No",
      loading: "Cargando...",
      cancel: "Cancelar",
      submit: "Enviar",
      confirm: "Confirmar",
      close: "Cerrar",
      copy: "Copiar",
      share: "Compartir",
      connectWallet: "Conectar Wallet",
      disconnect: "Desconectar",
      transactionCancelled: "Cancelado",
      error: "Error",
    },
    notFound: {
      message: "Página no encontrada",
      returnHome: "Inicio",
    },
  },
  FR: {
    welcome: {
      badge: "Marché de Prédiction Nouvelle Génération",
      taglineQuote: '"Si vous pouvez y penser, c’est important."',
      taglineSub: "Pariez sur n’importe quel sujet. Propulsé par la blockchain.",
      featureAnyTopic: "Tous les sujets",
      featureAnyTopicDesc: "Créer des marchés",
      featureTrade: "Trader",
      featureTradeDesc: "Oui ou Non",
      featureEarn: "Gagner",
      featureEarnDesc: "Récompenses",
      featureFast: "Rapide",
      featureFastDesc: "Règlement instantané",
      featureSocial: "Social",
      featureSocialDesc: "Communauté",
      featureWeb3: "Web3",
      featureWeb3Desc: "Décentralisé",
      connectButtonHint: "Connectez votre wallet",
    },
    getStarted: {
      badge: "Marché de Prédiction Nouvelle Génération",
      taglineQuote: '"Si vous pouvez y penser, c’est important."',
      featureTradePredictions: "Trader des prédictions",
      featureRealtimeMarkets: "Marchés en temps réel",
      featureAnyTopic: "Tous les sujets",
      connectButtonHint: "Connectez votre wallet",
      walletNotConnectedTitle: "Wallet non connecté",
      walletNotConnectedDesc: "Connectez votre wallet pour participer.",
    },
    nav: {
      backToMarkets: "Retour aux marchés",
      back: "Retour",
      previous: "Précédent",
      next: "Suivant",
      refresh: "Actualiser",
      refreshing: "Actualisation...",
    },
    myThots: {
      title: "Mes Thots",
      subtitle: "Marchés créés",
      marketCountSingular: "marché",
      marketCountPlural: "marchés",
      pageOf: "Page {current} sur {total}",
      connectWalletTitle: "Connectez votre wallet",
      connectWalletDesc: "Connectez votre wallet pour voir vos marchés.",
      loadingThots: "Chargement...",
      emptyStateTitle: "Aucun Thot",
      emptyStateDesc: "Vous n’avez encore rien créé.",
      createFirstThotButton: "Créer votre premier Thot",
    },
    yourThots: {
      title: "Vos Thots",
      subtitle: "Marchés votés",
      marketCountSingular: "marché",
      marketCountPlural: "marchés",
      pageOf: "Page {current} sur {total}",
      connectWalletTitle: "Connectez votre wallet",
      connectWalletDesc: "Connectez votre wallet pour voir vos votes.",
      loadingMarkets: "Chargement...",
      emptyStateTitle: "Aucun vote",
      emptyStateDesc: "Vous n’avez pas encore voté.",
      exploreMarketsButton: "Explorer",
    },
    history: {
      title: "Historique des gains",
      subtitle: "Vos récompenses",
      totalClaims: "Réclamations",
      totalEarned: "Gagné",
      marketsWon: "Gagnés",
      avgPerClaim: "Moyenne",
      connectWalletTitle: "Connectez votre wallet",
      connectWalletDesc: "Connectez votre wallet.",
      loadingHistory: "Chargement...",
      emptyStateTitle: "Aucun gain",
      emptyStateDesc: "Pas encore de gains.",
      exploreMarketsButton: "Explorer",
      positionId: "Position #{id}",
      won: "{label} gagné",
      clickHint: "Voir marché",
    },
    market: {
      loadingMarket: "Chargement...",
      marketNotFoundTitle: "Marché introuvable",
      marketNotFoundButton: "Retour",
      shareLinkCopied: "Lien copié",
      shareLinkCopiedDesc: "Inclut le réseau",
      copyLinkFailed: "Échec copie",
      copyLinkFailedDesc: "Copiez manuellement",
      shareFailed: "Échec partage",
      shareFailedDesc: "Essayez copier",
      invalidNetwork: "Réseau invalide",
      invalidNetworkDesc: "chainId non supporté={chainId}",
      walletNetworkMismatch: "Mauvais réseau",
      walletNetworkMismatchDesc: "Reconnectez",
      restoringWallet: "Restauration...",
      restoringWalletDesc: "Patientez",
      claimSuccessful: "Réclamé !",
      claimFailed: "Échec",
      noPositionsToClaim: "Rien à réclamer",
      kamikazeDisabled: "Kamikaze désactivé",
      kamikazeSuccessful: "Succès",
      kamikazeFailed: "Échec",
      noPositionsFound: "Aucune position",
      allPositionsKamikazed: "Déjà fait",
      selectAtLeastOne: "Sélectionnez au moins un",
    },
    voteModal: {
      selectOption: "Choisir option",
      enterAmount: "Entrer montant",
      voteSuccess: "Vote envoyé !",
      voteFailed: "Échec vote",
      walletNotConnected: "Connectez wallet",
      insufficientBalance: "Solde insuffisant",
      approvalRequired: "Approbation requise",
      approvalDesc: "Approbation...",
      tokenApproved: "Token approuvé !",
      proceedAnyway: "Continuer possible",
      connectToProceed: "Connectez wallet",
    },
    createMarket: {
      detailsStep: "Détails",
      confirmStep: "Confirmer",
      marketTitle: "Titre",
      marketSubtitle: "Sous-titre",
      marketDescription: "Description",
      posterImage: "URL image",
      tags: "Tags",
      optionAYes: "Option A (Oui)",
      optionBNo: "Option B (Non)",
      marketBalance: "Balance",
      endTime: "Fin",
      endTimeError: "Minimum +1h",
      forgoTimeButton: "Par défaut",
      useToken: "Utiliser token",
      tokenAddress: "Adresse",
      tokenError: "Adresse invalide",
      initialVote: "Vote initial",
      createMarketButton: "Créer",
      platformFee: "Frais",
      imageRequired: "Image requise",
      invalidImageUrl: "URL invalide",
    },
    common: {
      yes: "Oui",
      no: "Non",
      loading: "Chargement...",
      cancel: "Annuler",
      submit: "Envoyer",
      confirm: "Confirmer",
      close: "Fermer",
      copy: "Copier",
      share: "Partager",
      connectWallet: "Connecter Wallet",
      disconnect: "Déconnecter",
      transactionCancelled: "Annulé",
      error: "Erreur",
    },
    notFound: {
      message: "Page introuvable",
      returnHome: "Accueil",
    },
  },
  DE: {
    welcome: {
      badge: "Next-Gen Prognosemarkt",
      taglineQuote: '"Wenn du es denken kannst, ist es wichtig."',
      taglineSub: "Handle Vorhersagen zu jedem Thema.",
      featureAnyTopic: "Jedes Thema",
      featureAnyTopicDesc: "Märkte erstellen",
      featureTrade: "Handeln",
      featureTradeDesc: "Ja oder Nein",
      featureEarn: "Verdienen",
      featureEarnDesc: "Belohnungen",
      featureFast: "Schnell",
      featureFastDesc: "Sofortige Abwicklung",
      featureSocial: "Sozial",
      featureSocialDesc: "Community",
      featureWeb3: "Web3",
      featureWeb3Desc: "Dezentralisiert",
      connectButtonHint: "Wallet verbinden",
    },
    getStarted: {
      badge: "Next-Gen Prognosemarkt",
      taglineQuote: '"Wenn du es denken kannst, ist es wichtig."',
      featureTradePredictions: "Vorhersagen handeln",
      featureRealtimeMarkets: "Echtzeitmärkte",
      featureAnyTopic: "Jedes Thema",
      connectButtonHint: "Wallet verbinden",
      walletNotConnectedTitle: "Wallet nicht verbunden",
      walletNotConnectedDesc: "Verbinde dein Wallet.",
    },
    nav: {
      backToMarkets: "Zurück zu Märkten",
      back: "Zurück",
      previous: "Vorherige",
      next: "Nächste",
      refresh: "Aktualisieren",
      refreshing: "Wird aktualisiert...",
    },
    myThots: {
      title: "Meine Thots",
      subtitle: "Erstellte Märkte",
      marketCountSingular: "Markt",
      marketCountPlural: "Märkte",
      pageOf: "Seite {current} von {total}",
      connectWalletTitle: "Wallet verbinden",
      connectWalletDesc: "Verbinde dein Wallet.",
      loadingThots: "Lädt...",
      emptyStateTitle: "Keine Thots",
      emptyStateDesc: "Noch nichts erstellt.",
      createFirstThotButton: "Ersten Thot erstellen",
    },
    yourThots: {
      title: "Deine Thots",
      subtitle: "Gewählte Märkte",
      marketCountSingular: "Markt",
      marketCountPlural: "Märkte",
      pageOf: "Seite {current} von {total}",
      connectWalletTitle: "Wallet verbinden",
      connectWalletDesc: "Verbinde dein Wallet.",
      loadingMarkets: "Lädt...",
      emptyStateTitle: "Keine Votes",
      emptyStateDesc: "Noch nicht abgestimmt.",
      exploreMarketsButton: "Märkte entdecken",
    },
    history: {
      title: "Gewinnverlauf",
      subtitle: "Belohnungen",
      totalClaims: "Claims",
      totalEarned: "Verdient",
      marketsWon: "Gewonnen",
      avgPerClaim: "Ø",
      connectWalletTitle: "Wallet verbinden",
      connectWalletDesc: "Verbinde dein Wallet.",
      loadingHistory: "Lädt...",
      emptyStateTitle: "Keine Claims",
      emptyStateDesc: "Noch keine Gewinne.",
      exploreMarketsButton: "Märkte entdecken",
      positionId: "Position #{id}",
      won: "{label} gewonnen",
      clickHint: "Markt ansehen",
    },
    market: {
      loadingMarket: "Lädt...",
      marketNotFoundTitle: "Nicht gefunden",
      marketNotFoundButton: "Zurück",
      shareLinkCopied: "Link kopiert",
      shareLinkCopiedDesc: "Mit Netzwerk",
      copyLinkFailed: "Fehler",
      copyLinkFailedDesc: "Manuell kopieren",
      shareFailed: "Fehler",
      shareFailedDesc: "Link kopieren",
      invalidNetwork: "Ungültiges Netzwerk",
      invalidNetworkDesc: "chainId nicht unterstützt={chainId}",
      walletNetworkMismatch: "Falsches Netzwerk",
      walletNetworkMismatchDesc: "Neu verbinden",
      restoringWallet: "Wiederherstellen...",
      restoringWalletDesc: "Bitte warten",
      claimSuccessful: "Erfolgreich!",
      claimFailed: "Fehlgeschlagen",
      noPositionsToClaim: "Keine Claims",
      kamikazeDisabled: "Deaktiviert",
      kamikazeSuccessful: "Erfolg",
      kamikazeFailed: "Fehler",
      noPositionsFound: "Keine Positionen",
      allPositionsKamikazed: "Bereits erledigt",
      selectAtLeastOne: "Mindestens eins wählen",
    },
    voteModal: {
      selectOption: "Option wählen",
      enterAmount: "Betrag eingeben",
      voteSuccess: "Erfolgreich!",
      voteFailed: "Fehler",
      walletNotConnected: "Wallet verbinden",
      insufficientBalance: "Nicht genug",
      approvalRequired: "Genehmigung nötig",
      approvalDesc: "Genehmigung...",
      tokenApproved: "Genehmigt!",
      proceedAnyway: "Fortfahren möglich",
      connectToProceed: "Wallet verbinden",
    },
    createMarket: {
      detailsStep: "Details",
      confirmStep: "Bestätigen",
      marketTitle: "Titel",
      marketSubtitle: "Untertitel",
      marketDescription: "Beschreibung",
      posterImage: "Bild URL",
      tags: "Tags",
      optionAYes: "Option A (Ja)",
      optionBNo: "Option B (Nein)",
      marketBalance: "Balance",
      endTime: "Ende",
      endTimeError: "+1h nötig",
      forgoTimeButton: "Standard",
      useToken: "Token nutzen",
      tokenAddress: "Adresse",
      tokenError: "Ungültig",
      initialVote: "Startvote",
      createMarketButton: "Erstellen",
      platformFee: "Gebühr",
      imageRequired: "Bild nötig",
      invalidImageUrl: "Ungültige URL",
    },
    common: {
      yes: "Ja",
      no: "Nein",
      loading: "Lädt...",
      cancel: "Abbrechen",
      submit: "Senden",
      confirm: "Bestätigen",
      close: "Schließen",
      copy: "Kopieren",
      share: "Teilen",
      connectWallet: "Wallet verbinden",
      disconnect: "Trennen",
      transactionCancelled: "Abgebrochen",
      error: "Fehler",
    },
    notFound: {
      message: "Seite nicht gefunden",
      returnHome: "Start",
    },
  },
  PT: {
    welcome: {
      badge: "Mercado de Previsão de Nova Geração",
      taglineQuote: '"Se você pode pensar, é importante."',
      taglineSub: "Negocie previsões sobre qualquer tema.",
      featureAnyTopic: "Qualquer tema",
      featureAnyTopicDesc: "Criar mercados",
      featureTrade: "Negociar",
      featureTradeDesc: "Sim ou Não",
      featureEarn: "Ganhar",
      featureEarnDesc: "Recompensas",
      featureFast: "Rápido",
      featureFastDesc: "Liquidação instantânea",
      featureSocial: "Social",
      featureSocialDesc: "Comunidade",
      featureWeb3: "Web3",
      featureWeb3Desc: "Descentralizado",
      connectButtonHint: "Conecte sua carteira",
    },
    getStarted: {
      badge: "Mercado de Previsão de Nova Geração",
      taglineQuote: '"Se você pode pensar, é importante."',
      featureTradePredictions: "Negociar previsões",
      featureRealtimeMarkets: "Mercados em tempo real",
      featureAnyTopic: "Qualquer tema",
      connectButtonHint: "Conecte sua carteira",
      walletNotConnectedTitle: "Carteira não conectada",
      walletNotConnectedDesc: "Conecte sua carteira.",
    },
    nav: {
      backToMarkets: "Voltar",
      back: "Voltar",
      previous: "Anterior",
      next: "Próximo",
      refresh: "Atualizar",
      refreshing: "Atualizando...",
    },
    myThots: {
      title: "Meus Thots",
      subtitle: "Mercados criados",
      marketCountSingular: "mercado",
      marketCountPlural: "mercados",
      pageOf: "Página {current} de {total}",
      connectWalletTitle: "Conectar carteira",
      connectWalletDesc: "Conecte sua carteira.",
      loadingThots: "Carregando...",
      emptyStateTitle: "Sem Thots",
      emptyStateDesc: "Nada criado ainda.",
      createFirstThotButton: "Criar primeiro Thot",
    },
    yourThots: {
      title: "Seus Thots",
      subtitle: "Mercados votados",
      marketCountSingular: "mercado",
      marketCountPlural: "mercados",
      pageOf: "Página {current} de {total}",
      connectWalletTitle: "Conectar carteira",
      connectWalletDesc: "Conecte sua carteira.",
      loadingMarkets: "Carregando...",
      emptyStateTitle: "Sem votos",
      emptyStateDesc: "Ainda não votou.",
      exploreMarketsButton: "Explorar",
    },
    history: {
      title: "Histórico",
      subtitle: "Recompensas",
      totalClaims: "Resgates",
      totalEarned: "Ganho",
      marketsWon: "Ganhos",
      avgPerClaim: "Média",
      connectWalletTitle: "Conectar carteira",
      connectWalletDesc: "Conecte sua carteira.",
      loadingHistory: "Carregando...",
      emptyStateTitle: "Sem ganhos",
      emptyStateDesc: "Nenhum ainda.",
      exploreMarketsButton: "Explorar",
      positionId: "Posição #{id}",
      won: "{label} venceu",
      clickHint: "Ver mercado",
    },
    market: {
      loadingMarket: "Carregando...",
      marketNotFoundTitle: "Não encontrado",
      marketNotFoundButton: "Voltar",
      shareLinkCopied: "Link copiado",
      shareLinkCopiedDesc: "Inclui rede",
      copyLinkFailed: "Erro",
      copyLinkFailedDesc: "Copie manualmente",
      shareFailed: "Erro",
      shareFailedDesc: "Tente copiar",
      invalidNetwork: "Rede inválida",
      invalidNetworkDesc: "chainId não suportado={chainId}",
      walletNetworkMismatch: "Rede errada",
      walletNetworkMismatchDesc: "Reconectar",
      restoringWallet: "Restaurando...",
      restoringWalletDesc: "Aguarde",
      claimSuccessful: "Sucesso!",
      claimFailed: "Falha",
      noPositionsToClaim: "Nada",
      kamikazeDisabled: "Desativado",
      kamikazeSuccessful: "Sucesso",
      kamikazeFailed: "Falha",
      noPositionsFound: "Sem posições",
      allPositionsKamikazed: "Já feito",
      selectAtLeastOne: "Selecione um",
    },
    voteModal: {
      selectOption: "Escolher opção",
      enterAmount: "Valor",
      voteSuccess: "Sucesso!",
      voteFailed: "Erro",
      walletNotConnected: "Conectar carteira",
      insufficientBalance: "Saldo insuficiente",
      approvalRequired: "Aprovação necessária",
      approvalDesc: "Aprovando...",
      tokenApproved: "Aprovado!",
      proceedAnyway: "Pode continuar",
      connectToProceed: "Conectar carteira",
    },
    createMarket: {
      detailsStep: "Detalhes",
      confirmStep: "Confirmar",
      marketTitle: "Título",
      marketSubtitle: "Subtítulo",
      marketDescription: "Descrição",
      posterImage: "URL imagem",
      tags: "Tags",
      optionAYes: "Opção A (Sim)",
      optionBNo: "Opção B (Não)",
      marketBalance: "Saldo",
      endTime: "Fim",
      endTimeError: "+1h mínimo",
      forgoTimeButton: "Padrão",
      useToken: "Usar token",
      tokenAddress: "Endereço",
      tokenError: "Inválido",
      initialVote: "Inicial",
      createMarketButton: "Criar",
      platformFee: "Taxa",
      imageRequired: "Imagem necessária",
      invalidImageUrl: "URL inválida",
    },
    common: {
      yes: "Sim",
      no: "Não",
      loading: "Carregando...",
      cancel: "Cancelar",
      submit: "Enviar",
      confirm: "Confirmar",
      close: "Fechar",
      copy: "Copiar",
      share: "Compartilhar",
      connectWallet: "Conectar carteira",
      disconnect: "Desconectar",
      transactionCancelled: "Cancelado",
      error: "Erro",
    },
    notFound: {
      message: "Página não encontrada",
      returnHome: "Início",
    },
  },
  ZH: {
    welcome: {
      badge: "新一代预测市场",
      taglineQuote: "“如果你能想到，它就很重要。”",
      taglineSub: "在任何主题上进行预测交易，由区块链驱动。",
      featureAnyTopic: "任意主题",
      featureAnyTopicDesc: "创建市场",
      featureTrade: "交易",
      featureTradeDesc: "是 / 否",
      featureEarn: "赚取",
      featureEarnDesc: "奖励",
      featureFast: "快速",
      featureFastDesc: "即时结算",
      featureSocial: "社交",
      featureSocialDesc: "社区",
      featureWeb3: "Web3",
      featureWeb3Desc: "去中心化",
      connectButtonHint: "连接钱包或登录",
    },
    getStarted: {
      badge: "新一代预测市场",
      taglineQuote: "“如果你能想到，它就很重要。”",
      featureTradePredictions: "交易预测",
      featureRealtimeMarkets: "实时市场",
      featureAnyTopic: "任意主题",
      connectButtonHint: "连接钱包",
      walletNotConnectedTitle: "未连接钱包",
      walletNotConnectedDesc: "请连接钱包参与。",
    },
    nav: {
      backToMarkets: "返回市场",
      back: "返回",
      previous: "上一页",
      next: "下一页",
      refresh: "刷新",
      refreshing: "刷新中...",
    },
    myThots: {
      title: "我的 Thots",
      subtitle: "你创建的市场",
      marketCountSingular: "个市场",
      marketCountPlural: "个市场",
      pageOf: "第 {current} / {total} 页",
      connectWalletTitle: "连接钱包",
      connectWalletDesc: "连接钱包查看市场。",
      loadingThots: "加载中...",
      emptyStateTitle: "暂无 Thots",
      emptyStateDesc: "你还未创建市场。",
      createFirstThotButton: "创建第一个 Thot",
    },
    yourThots: {
      title: "你的 Thots",
      subtitle: "你参与的市场",
      marketCountSingular: "个市场",
      marketCountPlural: "个市场",
      pageOf: "第 {current} / {total} 页",
      connectWalletTitle: "连接钱包",
      connectWalletDesc: "连接钱包查看投票。",
      loadingMarkets: "加载中...",
      emptyStateTitle: "暂无投票",
      emptyStateDesc: "你还未参与。",
      exploreMarketsButton: "浏览市场",
    },
    history: {
      title: "领取记录",
      subtitle: "你的收益",
      totalClaims: "领取次数",
      totalEarned: "总收益",
      marketsWon: "获胜",
      avgPerClaim: "平均",
      connectWalletTitle: "连接钱包",
      connectWalletDesc: "请连接钱包。",
      loadingHistory: "加载中...",
      emptyStateTitle: "暂无记录",
      emptyStateDesc: "你还未领取。",
      exploreMarketsButton: "浏览市场",
      positionId: "持仓 #{id}",
      won: "{label} 胜出",
      clickHint: "查看市场",
    },
    market: {
      loadingMarket: "加载市场...",
      marketNotFoundTitle: "未找到市场",
      marketNotFoundButton: "返回",
      shareLinkCopied: "链接已复制",
      shareLinkCopiedDesc: "包含网络信息",
      copyLinkFailed: "复制失败",
      copyLinkFailedDesc: "请手动复制",
      shareFailed: "分享失败",
      shareFailedDesc: "请复制链接",
      invalidNetwork: "无效网络",
      invalidNetworkDesc: "不支持 chainId={chainId}",
      walletNetworkMismatch: "网络错误",
      walletNetworkMismatchDesc: "请切换网络",
      restoringWallet: "恢复钱包...",
      restoringWalletDesc: "请稍候",
      claimSuccessful: "领取成功！",
      claimFailed: "领取失败",
      noPositionsToClaim: "无可领取",
      kamikazeDisabled: "Kamikaze 已禁用",
      kamikazeSuccessful: "执行成功",
      kamikazeFailed: "执行失败",
      noPositionsFound: "无持仓",
      allPositionsKamikazed: "已全部执行",
      selectAtLeastOne: "至少选择一个",
    },
    voteModal: {
      selectOption: "选择选项",
      enterAmount: "输入金额",
      voteSuccess: "投票成功！",
      voteFailed: "投票失败",
      walletNotConnected: "未连接钱包",
      insufficientBalance: "余额不足",
      approvalRequired: "需要授权",
      approvalDesc: "正在授权代币",
      tokenApproved: "授权成功！",
      proceedAnyway: "仍可继续",
      connectToProceed: "连接钱包继续",
    },
    createMarket: {
      detailsStep: "详情",
      confirmStep: "确认",
      marketTitle: "标题",
      marketSubtitle: "副标题",
      marketDescription: "描述",
      posterImage: "图片 URL",
      tags: "标签",
      optionAYes: "选项 A（是）",
      optionBNo: "选项 B（否）",
      marketBalance: "金额",
      endTime: "结束时间",
      endTimeError: "至少 +1 小时",
      forgoTimeButton: "使用默认",
      useToken: "使用代币",
      tokenAddress: "地址",
      tokenError: "无效地址",
      initialVote: "初始投票",
      createMarketButton: "创建市场",
      platformFee: "手续费",
      imageRequired: "需要图片",
      invalidImageUrl: "无效 URL",
    },
    common: {
      yes: "是",
      no: "否",
      loading: "加载中...",
      cancel: "取消",
      submit: "提交",
      confirm: "确认",
      close: "关闭",
      copy: "复制",
      share: "分享",
      connectWallet: "连接钱包",
      disconnect: "断开连接",
      transactionCancelled: "已取消",
      error: "错误",
    },
    notFound: {
      message: "页面未找到",
      returnHome: "返回首页",
    },
  },
};

// Helper function to get translation with optional interpolation
export function t(
  lang: LanguageCode,
  key: string,
  interpolations?: Record<string, string | number>
): string {
  const keys = key.split(".");
  let value: unknown = translations[lang];

  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      return key; // Return key if translation not found
    }
  }

  if (typeof value !== "string") {
    return key;
  }

  // Apply interpolations
  if (interpolations) {
    return value.replace(/\{(\w+)\}/g, (_, match) => {
      const replacement = interpolations[match];
      return replacement !== undefined ? String(replacement) : `{${match}}`;
    });
  }

  return value;
}
