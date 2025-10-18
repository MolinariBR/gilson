#!/bin/bash

# Testa API de perfil
curl -i https://pastel-delivery.squareweb.app/api/user/profile

echo -e "\n---\n"
# Testa login (ajuste os dados conforme necessário)
curl -i -X POST https://pastel-delivery.squareweb.app/api/user/login \
  -H "Content-Type: application/json" \
  -d '{"name":"usuario_teste","password":"senha_teste"}'

echo -e "\n---\n"
# Testa upload de imagem (ajuste o caminho conforme necessário)
# curl -i -X POST https://pastel-delivery.squareweb.app/api/category/upload \
#   -F "image=@/caminho/para/imagem.jpg"

echo -e "\n---\n"
# Testa acesso ao frontend
curl -i https://pastel-delivery.squareweb.app/

echo -e "\n---\n"
# Testa acesso ao admin
curl -i https://pastel-delivery.squareweb.app/admin/

echo -e "\n---\n"
# Testa acesso a uma imagem de categoria (ajuste o nome conforme necessário)
# curl -i https://pastel-delivery.squareweb.app/uploads/nome_da_imagem.jpg
