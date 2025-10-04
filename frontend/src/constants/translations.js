/**
 * Translation constants for Portuguese Brazilian (PT-BR) localization
 * Organized by functional areas for better maintainability
 */

export const TRANSLATIONS = {
  // Navigation and menu items
  navigation: {
    home: "início",
    menu: "cardápio", 
    mobileApp: "app móvel",
    contactUs: "fale conosco",
    signIn: "entrar",
    orders: "pedidos",
    logout: "sair"
  },

  // Authentication related texts
  authentication: {
    enterYourName: "Digite seu nome",
    yourName: "Seu nome",
    enter: "Entrar",
    welcome: "Bem-vindo",
    pleaseEnterName: "Por favor, digite seu nome",
    termsCondition: "Ao continuar, eu concordo com os termos de uso e política de privacidade.",
    logoutSuccess: "Logout realizado com sucesso",
    pleaseLoginFirst: "Por favor, faça login primeiro"
  },

  // Header and main content
  header: {
    mainTitle: "Peça sua comida favorita aqui",
    description: "Escolha entre uma variedade diversificada de pratos deliciosos elaborados com os melhores ingredientes e expertise culinária. Nossa missão é satisfazer seus desejos e elevar sua experiência gastronômica, uma refeição deliciosa por vez.",
    viewMenu: "Ver Cardápio"
  },

  // Menu exploration
  menu: {
    exploreTitle: "Explore nosso cardápio",
    exploreDescription: "Escolha entre uma variedade diversificada de pratos deliciosos. Nossa missão é satisfazer seus desejos e elevar sua experiência gastronômica, uma refeição deliciosa por vez.",
    topDishes: "Principais pratos perto de você"
  },

  // Cart related texts
  cart: {
    items: "Itens",
    title: "Título", 
    price: "Preço",
    quantity: "Quantidade",
    total: "Total",
    remove: "Remover",
    cartTotals: "Total do Carrinho",
    subtotal: "Subtotal",
    deliveryFee: "Taxa de Entrega",
    proceedToCheckout: "FINALIZAR COMPRA",
    promoCode: "Se você tem um código promocional, digite aqui",
    promoCodePlaceholder: "código promocional",
    submit: "Enviar",
    pleaseAddItems: "Por favor, adicione itens ao carrinho"
  },

  // Order placement and delivery
  order: {
    deliveryInformation: "Informações de Entrega",
    street: "Rua",
    number: "Número", 
    cep: "CEP (Opcional)",
    phone: "Telefone",
    phonePlaceholder: "(11) 99999-9999",
    selectNeighborhood: "Selecione o Bairro",
    deliveryZone: "Zona de Entrega",
    proceedToPayment: "PROSSEGUIR PARA PAGAMENTO",
    orders: "Pedidos",
    items: "itens",
    trackOrder: "Rastrear Pedido"
  },

  // Footer content
  footer: {
    company: "Empresa",
    home: "Início",
    aboutUs: "Sobre Nós", 
    delivery: "Entrega",
    privacyPolicy: "Política de Privacidade",
    getInTouch: "Entre em Contato",
    copyright: "Copyright 2024 © Tomato.com - Todos os direitos reservados.",
    description: "Somos uma plataforma de delivery de comida dedicada a conectar você aos melhores restaurantes da sua região. Nossa missão é proporcionar uma experiência gastronômica excepcional, entregando pratos deliciosos e frescos diretamente na sua porta, com rapidez e qualidade garantidas."
  },

  // App download section
  appDownload: {
    title: "Para uma Melhor Experiência, Baixe o App Tomato",
    description: "Baixe nosso aplicativo móvel para uma experiência de pedidos mais rápida e conveniente"
  },

  // General buttons and actions
  general: {
    add: "Adicionar",
    remove: "Remover", 
    cancel: "Cancelar",
    confirm: "Confirmar",
    save: "Salvar",
    edit: "Editar",
    delete: "Excluir",
    search: "Buscar",
    filter: "Filtrar",
    loading: "Carregando...",
    error: "Erro",
    success: "Sucesso"
  },

  // Form validation messages
  validation: {
    required: "Este campo é obrigatório",
    invalidEmail: "Email inválido",
    invalidPhone: "Telefone inválido", 
    phoneRequired: "Telefone é obrigatório",
    phoneInvalidFormat: "Formato de telefone inválido. Use (11) 99999-9999",
    phoneInvalidAreaCode: "Código de área inválido",
    phoneTooShort: "Telefone deve ter pelo menos 10 dígitos",
    phoneTooLong: "Telefone deve ter no máximo 11 dígitos",
    phoneMobileFormat: "Celular deve começar com 9 após o código de área",
    minLength: "Mínimo de {min} caracteres",
    maxLength: "Máximo de {max} caracteres",
    invalidCep: "CEP inválido",
    fillRequiredFields: "Por favor, preencha todos os campos obrigatórios do endereço",
    failedToLoadNeighborhoods: "Falha ao carregar bairros",
    errorPlacingOrder: "Erro ao realizar pedido!"
  },

  // Toast messages
  messages: {
    itemAdded: "Item adicionado ao carrinho",
    itemRemoved: "Item removido do carrinho",
    orderPlaced: "Pedido realizado com sucesso",
    orderCancelled: "Pedido cancelado",
    networkError: "Erro de conexão. Tente novamente.",
    serverError: "Erro no servidor. Tente novamente mais tarde.",
    errorFetchingProducts: "Erro! Não foi possível carregar os produtos.",
    errorFetchingCategories: "Erro ao carregar categorias. Usando categorias padrão."
  }
};

/**
 * Helper function to safely access nested translation keys
 * @param {string} path - Dot notation path to translation key (e.g., 'navigation.home')
 * @param {string} fallback - Fallback text if translation not found
 * @param {Object} params - Parameters for string interpolation
 * @returns {string} Translated text or fallback
 */
export const getTranslation = (path, fallback = '', params = {}) => {
  try {
    const keys = path.split('.');
    let translation = keys.reduce((obj, key) => obj && obj[key], TRANSLATIONS);
    
    if (!translation) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Translation missing for: ${path}`);
      }
      return fallback;
    }

    // Handle string interpolation
    if (typeof translation === 'string' && Object.keys(params).length > 0) {
      return Object.keys(params).reduce((str, key) => {
        return str.replace(new RegExp(`{${key}}`, 'g'), params[key]);
      }, translation);
    }

    return translation;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Error accessing translation for: ${path}`, error);
    }
    return fallback;
  }
};

/**
 * Helper function to get translation with user name interpolation
 * @param {string} key - Translation key
 * @param {string} userName - User name to interpolate
 * @returns {string} Translated text with user name
 */
export const getWelcomeMessage = (userName) => {
  return `${TRANSLATIONS.authentication.welcome}, ${userName}!`;
};