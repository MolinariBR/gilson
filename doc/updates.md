# OBS CRITICA: SEMPRE CONTULTAR CODIGO PARA SABER SE A IMPLEMENTAÇÃO JÁ EXISTE ANTES DE CRIAR

A ideia é que o **dev saiba o que precisa persistir e consultar**, e o **PO/usuário** entenda o valor e o comportamento.
Abaixo está a versão refinada das suas histórias com essa pegada 👇

---

## 🧍‍♀️ **User Stories – Usuário**

### **US 1 – Endereço persistente**

**Como** usuário,
**quero** registrar meu endereço apenas uma vez,
**para** que ele seja salvo e usado automaticamente nas próximas compras.

**Notas para Dev:**

* O endereço deve ser **salvo no banco de dados** e **vinculado ao usuário logado**.
* O sistema deve **verificar se o usuário já possui um endereço salvo** antes de solicitar novamente.
* Ao alterar o endereço, a alteração deve **atualizar o registro existente (UPDATE)**, não criar um novo.

---

### **US 2 – Página de Perfil**

**Como** usuário,
**quero** acessar uma página de perfil,
**para** visualizar e editar minhas informações pessoais e de contato.

**Notas para Dev:**

* A página deve **carregar os dados existentes do usuário (READ)**.
* Ao salvar as alterações, deve **atualizar os registros correspondentes no banco (UPDATE)**.
* Se o usuário não tiver endereço cadastrado, deve poder **adicionar um novo (CREATE)**.
* A persistência deve garantir que os dados atualizados sejam refletidos em todo o sistema (checkout, histórico etc.).

---

### **US 3 – Rastrear pedido pelo WhatsApp**

**Como** usuário,
**quero** clicar no botão “Rastrear pedido” e ser redirecionado ao WhatsApp do entregador,
**para** acompanhar minha entrega em tempo real.

**Notas para Dev:**

* Cada pedido deve ter **um entregador vinculado no banco (READ RELACIONAL)**.
* O botão de rastreio deve **buscar o número do entregador vinculado ao pedido** e gerar o link dinâmico para o WhatsApp.
* Caso o pedido não tenha entregador associado, o botão deve ser desativado ou exibir mensagem adequada.

---

## 💻 **User Stories – Dev / Técnico**

### **DEV 1 – CRUD de Entregadores**

**Como** desenvolvedor,
**quero** criar uma área de gerenciamento de entregadores,
**para** que administradores possam cadastrar e vincular entregadores aos pedidos.

**Notas para Dev:**

* O sistema deve permitir as operações **CRUD completas (CREATE, READ, UPDATE, DELETE)** sobre entregadores.
* Os dados devem ser **armazenados no banco** e estar disponíveis para associação aos pedidos.
* A exclusão deve ser lógica (soft delete) se houver histórico de entregas associadas.

---

### **DEV 2 – Integração de Entregador ao Pedido**

**Como** desenvolvedor,
**quero** que o botão “Rastrear pedido” exiba o nome e número do entregador,
**para** permitir contato direto entre cliente e entregador.

**Notas para Dev:**

* O pedido deve estar **relacionado ao entregador no banco de dados**.
* O botão deve usar dados persistidos (nome e WhatsApp) para montar o link de contato.
* A relação deve ser **consultada (READ)** a partir da entidade de pedidos.
* Atualizações de status de entrega devem refletir no banco (UPDATE).

---

## 🧩 **Resumo de Integração CRUD (de forma descritiva)**

| Ação   | Origem                                                 | Descrição resumida                       |
| ------ | ------------------------------------------------------ | ---------------------------------------- |
| CREATE | Usuário cadastra endereço ou admin cadastra entregador | Gera novo registro persistido            |
| READ   | Perfil, checkout, pedidos, entregadores                | Busca dados existentes                   |
| UPDATE | Usuário altera informações ou status de entrega        | Atualiza registros existentes            |
| DELETE | Admin remove entregador inativo                        | Exclusão lógica para preservar histórico |



 