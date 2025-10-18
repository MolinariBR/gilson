# OBS CRITICA: SEMPRE CONTULTAR CODIGO PARA SABER SE A IMPLEMENTAÇÃO JÁ EXISTE ANTES DE CRIAR

> 📘 *User Story*
>  ↳ *Tasks numeradas (task 1.0.x, 1.1.x...)*

O foco aqui é manter **clareza**, **encadeamento lógico** e **contexto de banco + CRUD**, mas sem transformar em documentação técnica pesada.
As tasks são diretas, práticas e guiadas pela necessidade real de implementação.

---

# 🧩 Backlog de Implementação — User Stories e Tasks

---

## 🧍‍♀️ **US 1 – Endereço Persistente**

> **Como** usuário, quero registrar meu endereço apenas uma vez, **para** que ele seja salvo e usado automaticamente nas próximas compras.

**Notas para Dev:**

* O endereço deve ser salvo e vinculado ao usuário logado.
* O sistema deve verificar se já existe um endereço antes de solicitar novamente.
* Alterações devem atualizar o registro existente (UPDATE).

---

### 🧱 **Tasks US 1**

**task 1.0.0 — Criar endpoint para salvar endereço do usuário**

* Implementar persistência (CREATE) de endereço vinculado ao ID do usuário.
* Validar campos obrigatórios (rua, número, bairro, CEP).
* Retornar confirmação de sucesso ou erro de validação.

**task 1.0.1 — Carregar endereço existente no checkout**

* Buscar endereço do usuário (READ).
* Preencher automaticamente o formulário de checkout.
* Exibir opção de editar ou usar o mesmo endereço.

**task 1.0.2 — Atualizar endereço salvo**

* Permitir edição e atualização do endereço (UPDATE).
* Garantir que o mesmo registro seja atualizado e não duplicado.
* Sincronizar com a página de perfil.

**task 1.0.3 — Validação e testes de fluxo de endereço**

* Verificar persistência correta no banco.
* Testar comportamento quando o usuário não tem endereço salvo.
* Garantir consistência entre front e backend.

---

## 🧍‍♀️ **US 2 – Página de Perfil**

> **Como** usuário, quero acessar uma página de perfil **para** editar minhas informações pessoais e de contato.

**Notas para Dev:**

* Deve permitir visualização (READ) e edição (UPDATE).
* Deve exibir e atualizar também o endereço vinculado.
* O WhatsApp deve seguir formato padrão +55.

---

### 🧱 **Tasks US 2**

**task 1.1.0 — Criar endpoint de leitura de perfil do usuário**

* Retornar nome, WhatsApp e dados de endereço vinculados.
* Requer autenticação (usuário logado).

**task 1.1.1 — Criar endpoint de atualização de perfil**

* Permitir alteração de nome e WhatsApp (UPDATE).
* Validar formato do número antes de persistir.

**task 1.1.2 — Implementar interface da página de perfil**

* Criar tela com campos editáveis (nome, endereço, WhatsApp).
* Adicionar botão “Salvar alterações”.
* Exibir confirmação visual de sucesso.

**task 1.1.3 — Integrar atualização de perfil com endereço persistente**

* Permitir que alterações no endereço reflitam também na tabela de endereço.
* Garantir sincronização entre o perfil e o fluxo de checkout.

---

## 📦 **US 3 – Rastrear Pedido pelo WhatsApp**

> **Como** usuário, quero clicar em “Rastrear pedido” e ser redirecionado ao WhatsApp do entregador **para** acompanhar minha entrega em tempo real.

**Notas para Dev:**

* Cada pedido deve estar vinculado a um entregador.
* O botão deve gerar link dinâmico `https://wa.me/55<número>`.
* Caso não haja entregador, o botão fica inativo.

---

### 🧱 **Tasks US 3**

**task 1.2.0 — Vincular entregador ao pedido**

* Criar campo de referência ao entregador no pedido.
* Validar se o entregador está ativo antes da vinculação.

**task 1.2.1 — Atualizar botão de rastreamento**

* Alterar label para “Entregador”.
* Buscar nome e WhatsApp do entregador (READ).
* Redirecionar ao link dinâmico do WhatsApp.

**task 1.2.2 — Tratar pedidos sem entregador**

* Desabilitar botão “Entregador” até que um entregador seja atribuído.
* Exibir mensagem amigável: “Entregador ainda não definido.”

**task 1.2.3 — Testes de rastreio de pedido**

* Garantir que o botão abra o WhatsApp correto.
* Validar comportamento quando o pedido muda de status.

---

## 💻 **DEV 1 – CRUD de Entregadores**

> **Como** dev, quero criar uma área de gerenciamento de entregadores **para** permitir cadastro, edição e vinculação aos pedidos.

**Notas para Dev:**

* Deve suportar operações CRUD completas.
* Exclusão deve ser lógica (soft delete).
* Dados de entregadores devem ser acessíveis para vinculação.

---

### 🧱 **Tasks DEV 1**

**task 1.3.0 — Criar endpoint de cadastro de entregador**

* Implementar operação CREATE com validação (nome e WhatsApp).

**task 1.3.1 — Criar endpoint para listagem de entregadores**

* Permitir leitura (READ) de todos os entregadores ativos.
* Adicionar filtros opcionais (nome, status).

**task 1.3.2 — Criar endpoint para atualização de entregador**

* Permitir alteração de dados básicos (UPDATE).
* Validar WhatsApp no formato correto.

**task 1.3.3 — Criar endpoint de exclusão lógica**

* Implementar DELETE lógico (soft delete).
* Impedir exclusão de entregadores vinculados a pedidos ativos.

---

## 💻 **DEV 2 – Integração Pedido ↔ Entregador**

> **Como** dev, quero que o botão “Rastrear pedido” exiba o nome e número do entregador **para** o cliente ter contato direto com ele.

**Notas para Dev:**

* O pedido deve retornar dados do entregador.
* O botão deve gerar link dinâmico com base nesses dados.
* As atualizações devem refletir no histórico de pedidos.

---

### 🧱 **Tasks DEV 2**

**task 1.4.0 — Criar operação de vínculo entre pedido e entregador**

* Atualizar pedido com ID do entregador (UPDATE).
* Garantir integridade referencial no banco.

**task 1.4.1 — Atualizar retorno da API de pedidos**

* Incluir nome e WhatsApp do entregador no JSON do pedido (READ relacional).

**task 1.4.2 — Integrar front-end do botão com API de pedidos**

* Buscar dados do entregador via API.
* Montar link de WhatsApp dinamicamente.
* Validar comportamento em desktop e mobile.

---

# 🔗 **Visão Geral de Dependência**

| User Story | Tasks principais | Depende de    |
| ---------- | ---------------- | ------------- |
| US 1       | 1.0.0 – 1.0.3    | —             |
| US 2       | 1.1.0 – 1.1.3    | US 1          |
| US 3       | 1.2.0 – 1.2.3    | DEV 1 / DEV 2 |
| DEV 1      | 1.3.0 – 1.3.3    | —             |
| DEV 2      | 1.4.0 – 1.4.2    | DEV 1         |