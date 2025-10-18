# Plano de Ação: Refatoração para Nova Arquitetura

Este documento detalha as mudanças necessárias para adaptar o projeto "TOMATO" à nova arquitetura, que inclui MercadoPago, autenticação simplificada e gerenciamento de zonas de entrega.

---

## Backend (`/backend`)

### 1. Modelos de Dados (`/models`)

-   **[MODIFICAR] `userModel.js`**:
    -   Remover o campo `password`.
    -   Garantir que o campo `name` seja tratado como um identificador único.
-   **[MODIFICAR] `orderModel.js`**:
    -   Alterar o schema do campo `address` para um objeto: `{ street: String, number: String, neighborhood: String, zone: String, cep: String }`.
-   **[CRIAR] `zoneModel.js`**:
    -   Criar um novo arquivo e schema para gerenciar zonas e bairros.
    -   Estrutura sugerida: `{ name: String, neighborhoods: [String] }`.

### 2. Controladores (`/controllers`)

-   **[REESCREVER] `userController.js`**:
    -   Adaptar as funções `loginUser` e `registerUser` para a nova lógica de autenticação baseada apenas em `name`.
    -   **Atenção:** Esta é uma mudança crítica de segurança e deve ser tratada com cuidado.
-   **[REESCREVER] `orderController.js`**:
    -   Na função `placeOrder`:
        -   Remover toda a lógica de integração com o Stripe.
        -   Implementar a criação de uma "preferência de pagamento" na API do MercadoPago.
        -   Retornar a URL de pagamento (`init_point`) para o frontend.
    -   **[CRIAR]** Nova função `verifyPayment`:
        -   Servirá como o endpoint de webhook para o MercadoPago.
        -   Receberá notificações de pagamento e atualizará o status do pedido no banco de dados (de "Pendente" para "Pago" ou "Falhou").
-   **[CRIAR] `zoneController.js`**:
    -   Implementar as funções de CRUD (Create, Read, Update, Delete) para gerenciar as zonas e seus bairros.

### 3. Rotas (`/routes`)

-   **[MODIFICAR] `orderRoute.js`**:
    -   Adicionar uma nova rota `POST` para o webhook do MercadoPago (ex: `/verify-payment`).
-   **[CRIAR] `zoneRoute.js`**:
    -   Criar as rotas (`GET`, `POST`, `PUT`, `DELETE`) que usarão o `zoneController`.

---

## Frontend (`/frontend`)

### 1. Contexto Global (`/context/StoreContext.jsx`)

-   **[MODIFICAR]** A lógica de autenticação: remover o uso de `token` JWT e adaptar o estado do usuário para refletir o login simplificado.
-   **[MODIFICAR]** A função `placeOrder`:
    -   Deve coletar os novos campos de endereço do formulário.
    -   Deve esperar a URL do MercadoPago como resposta do backend e redirecionar o usuário.

### 2. Componentes e Páginas

-   **[REESCREVER] `components/LoginPopup/LoginPopup.jsx`**:
    -   Simplificar o formulário para conter apenas um campo ("Seu Nome") e um botão ("Entrar").
-   **[REESCREVER] `pages/PlaceOrder/PlaceOrder.jsx`**:
    -   Alterar o formulário de endereço para os campos: `Rua`, `Número`, `Bairro` (idealmente um `<select>`), e `CEP` (opcional).

---

## Painel de Administração (`/admin`)

### 1. Componentes e Páginas

-   **[CRIAR] `pages/Zones/Zones.jsx`**:
    -   Desenvolver uma nova página completa para o gerenciamento de zonas de entrega.
    -   Deve incluir uma tabela para listar as zonas e formulários para adicionar/editar zonas e os bairros associados.
-   **[MODIFICAR] `components/Sidebar/Sidebar.jsx`**:
    -   Adicionar um novo link no menu lateral para a página "Zonas de Entrega".

---

## Passos Finais de Configuração

-   **[OBRIGATÓRIO]** Preencher o arquivo `/backend/.env` com as suas chaves reais do MongoDB e do MercadoPago.
-   **[OBRIGATÓRIO]** Conforme o `README.md` original, verificar e ajustar as variáveis de URL que conectam o frontend e o backend nos seguintes arquivos:
    -   `admin/src/App.jsx` (variável `url`)
    -   `frontend/src/context/StoreContext.jsx` (variável `url`)
