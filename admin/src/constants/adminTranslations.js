/**
 * Admin Translation constants for Portuguese Brazilian (PT-BR) localization
 * Organized by functional areas for better maintainability
 */

export const ADMIN_TRANSLATIONS = {
  // Authentication
  authentication: {
    login: "Entrar",
    adminName: "Nome do Administrador",
    loginSuccessfully: "Login realizado com sucesso",
    notAdmin: "Você não é um administrador",
    pleaseLoginFirst: "Por favor, faça login primeiro",
    logout: "Sair",
    logoutSuccessfully: "Logout realizado com sucesso"
  },

  // Navigation
  navigation: {
    addItems: "Adicionar Itens",
    listItems: "Listar Itens", 
    orders: "Pedidos",
    deliveryZones: "Zonas de Entrega",
    categories: "Categorias"
  },

  // Product Management
  products: {
    uploadImage: "Enviar imagem",
    productName: "Nome do produto",
    productDescription: "Descrição do produto",
    productCategory: "Categoria do produto",
    productPrice: "Preço do produto",
    typeHere: "Digite aqui",
    writeContentHere: "Escreva o conteúdo aqui",
    add: "ADICIONAR",
    allFoodList: "Lista de Todos os Alimentos",
    image: "Imagem",
    name: "Nome",
    category: "Categoria", 
    price: "Preço",
    action: "Ação",
    productAdded: "Produto adicionado com sucesso",
    productRemoved: "Produto removido com sucesso",
    errorAddingProduct: "Erro ao adicionar produto",
    errorRemovingProduct: "Erro ao remover produto",
    selectCategory: "Selecione uma categoria"
  },

  // Orders Management
  orders: {
    orderPage: "Página de Pedidos",
    items: "Itens",
    customer: "Cliente",
    phone: "Telefone",
    customerPhone: "Telefone do Cliente",
    foodProcessing: "Processando Comida",
    outForDelivery: "Saiu para Entrega",
    delivered: "Entregue",
    printOrder: "Imprimir Pedido",
    printSuccess: "Pedido impresso com sucesso",
    printError: "Erro ao imprimir pedido",
    statusUpdated: "Status do pedido atualizado com sucesso",
    errorUpdatingStatus: "Erro ao atualizar status do pedido"
  },

  // Zones Management
  zones: {
    deliveryZonesManagement: "Gerenciamento de Zonas de Entrega",
    addNewZone: "Adicionar Nova Zona",
    editZone: "Editar Zona",
    zoneName: "Nome da Zona",
    neighborhoods: "Bairros",
    status: "Status",
    actions: "Ações",
    active: "Ativo",
    inactive: "Inativo",
    edit: "Editar",
    delete: "Excluir",
    enterZoneName: "Digite o nome da zona",
    enterNeighborhoodName: "Digite o nome do bairro",
    addNeighborhood: "Adicionar Bairro",
    remove: "Remover",
    createZone: "Criar Zona",
    updateZone: "Atualizar Zona",
    cancel: "Cancelar",
    zoneNameRequired: "Nome da zona é obrigatório",
    atLeastOneNeighborhood: "Pelo menos um bairro é obrigatório",
    confirmDelete: "Tem certeza que deseja excluir esta zona?",
    noZonesFound: "Nenhuma zona encontrada. Crie sua primeira zona de entrega!",
    zoneCreated: "Zona criada com sucesso",
    zoneUpdated: "Zona atualizada com sucesso",
    zoneDeleted: "Zona excluída com sucesso",
    errorCreatingZone: "Erro ao criar zona",
    errorUpdatingZone: "Erro ao atualizar zona",
    errorDeletingZone: "Erro ao excluir zona",
    errorFetchingZones: "Erro ao buscar zonas",
    errorSavingZone: "Erro ao salvar zona"
  },

  // Categories (matching frontend categories)
  categories: {
    "Salad": "Salada",
    "Rolls": "Rolinhos",
    "Deserts": "Sobremesas", 
    "Sandwich": "Sanduíche",
    "Cake": "Bolo",
    "Pure Veg": "Vegetariano",
    "Pasta": "Massa",
    "Noodles": "Macarrão",
    // Category Management
    categoryManagement: "Gerenciamento de Categorias",
    addNewCategory: "Adicionar Nova Categoria",
    editCategory: "Editar Categoria",
    categoryName: "Nome da Categoria",
    categoryImage: "Imagem da Categoria",
    image: "Imagem",
    name: "Nome",
    status: "Status",
    order: "Ordem",
    actions: "Ações",
    active: "Ativo",
    inactive: "Inativo",
    noCategoriesFound: "Nenhuma categoria encontrada",
    createFirstCategory: "Crie sua primeira categoria para começar!",
    categoryCreated: "Categoria criada com sucesso",
    categoryUpdated: "Categoria atualizada com sucesso",
    categoryDeleted: "Categoria excluída com sucesso",
    statusUpdated: "Status da categoria atualizado com sucesso",
    errorFetchingCategories: "Erro ao buscar categorias",
    errorCreatingCategory: "Erro ao criar categoria",
    errorUpdatingCategory: "Erro ao atualizar categoria",
    errorDeletingCategory: "Erro ao excluir categoria",
    errorUpdatingStatus: "Erro ao atualizar status da categoria",
    errorSavingCategory: "Erro ao salvar categoria",
    confirmDelete: "Confirmar Exclusão",
    deleteConfirmMessage: "Tem certeza que deseja excluir a categoria",
    deleteWarning: "Esta ação não pode ser desfeita. Certifique-se de que nenhum produto está associado a esta categoria.",
    // Form validations
    nameRequired: "Nome da categoria é obrigatório",
    nameMinLength: "Nome da categoria deve ter pelo menos 2 caracteres",
    nameMaxLength: "Nome da categoria deve ter menos de 50 caracteres",
    imageRequired: "Imagem da categoria é obrigatória",
    orderMinValue: "Ordem deve ser um número positivo",
    // Form fields
    enterCategoryName: "Digite o nome da categoria",
    displayOrder: "Ordem de Exibição",
    activeCategory: "Categoria Ativa",
    orderHelpText: "Números menores aparecem primeiro no menu",
    activeHelpText: "Apenas categorias ativas serão exibidas aos usuários",
    // Image upload
    dragDropImage: "Arraste e solte uma imagem aqui",
    orClickToSelect: "ou clique para selecionar",
    supportedFormats: "Suportados: JPG, PNG, WEBP (máx 2MB)",
    clickToChange: "Clique para alterar",
    invalidImageType: "Por favor, selecione um arquivo de imagem válido (JPG, PNG, WEBP)",
    imageTooLarge: "O tamanho da imagem deve ser menor que 2MB"
  },

  // General messages
  messages: {
    error: "Erro",
    success: "Sucesso",
    loading: "Carregando...",
    confirm: "Confirmar",
    cancel: "Cancelar",
    save: "Salvar",
    edit: "Editar",
    delete: "Excluir",
    add: "Adicionar",
    remove: "Remover",
    saving: "Salvando...",
    update: "Atualizar",
    create: "Criar"
  }
};

/**
 * Helper function to safely access nested admin translation keys
 * @param {string} path - Dot notation path to translation key (e.g., 'authentication.login')
 * @param {string} fallback - Fallback text if translation not found
 * @param {Object} params - Parameters for string interpolation
 * @returns {string} Translated text or fallback
 */
export const getAdminTranslation = (path, fallback = '', params = {}) => {
  try {
    // Handle invalid path types
    if (!path || typeof path !== 'string') {
      if (import.meta.env.DEV) {
        console.warn(`Admin translation missing for: ${path}`);
      }
      return fallback;
    }

    const keys = path.split('.');
    let translation = keys.reduce((obj, key) => obj && obj[key], ADMIN_TRANSLATIONS);
    
    if (!translation) {
      if (import.meta.env.DEV) {
        console.warn(`Admin translation missing for: ${path}`);
      }
      return fallback;
    }

    // Handle string interpolation - ensure params is an object
    if (typeof translation === 'string' && params && typeof params === 'object' && Object.keys(params).length > 0) {
      return Object.keys(params).reduce((str, key) => {
        return str.replace(new RegExp(`{${key}}`, 'g'), params[key]);
      }, translation);
    }

    return translation;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(`Error accessing admin translation for: ${path}`, error);
    }
    return fallback;
  }
};

/**
 * Helper function to get category translation from English to Portuguese
 * @param {string} englishCategory - English category name
 * @returns {string} Portuguese category name or original if not found
 */
export const getCategoryTranslation = (englishCategory) => {
  return ADMIN_TRANSLATIONS.categories[englishCategory] || englishCategory;
};

/**
 * Helper function to get all available categories in Portuguese
 * @returns {Object} Object with English keys and Portuguese values
 */
export const getAllCategoryTranslations = () => {
  return ADMIN_TRANSLATIONS.categories;
};

/**
 * Helper function to get order status translation
 * @param {string} status - Order status in English
 * @returns {string} Translated status or original if not found
 */
export const getOrderStatusTranslation = (status) => {
  const statusMap = {
    "Food Processing": ADMIN_TRANSLATIONS.orders.foodProcessing,
    "Out for delivery": ADMIN_TRANSLATIONS.orders.outForDelivery,
    "Delivered": ADMIN_TRANSLATIONS.orders.delivered
  };
  
  return statusMap[status] || status;
};