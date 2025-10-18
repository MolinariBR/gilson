
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../server.js";
import userModel from "../models/userModel.js";
import jwt from "jsonwebtoken";

describe("Integração: /user/profile", () => {
  let server;
  let token;
  let user;

  beforeAll(async () => {
    // Inicia o servidor
    server = app.listen(0);
    // Cria usuário de teste
    user = await userModel.create({ name: "Teste Integração", whatsapp: "+5599999999999", address: { street: "Rua Teste", number: "1", neighborhood: "Centro", cep: "12345678" } });
    token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || "testsecret");
  });

  afterAll(async () => {
    await userModel.deleteOne({ _id: user._id });
    await server.close();
  });

  it("deve retornar o perfil do usuário autenticado", async () => {
    const res = await request(server)
  .get("/api/user/profile")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Teste Integração");
    expect(res.body.whatsapp).toBe("+5599999999999");
    expect(res.body.address.street).toBe("Rua Teste");
  });

  it("deve atualizar o perfil do usuário autenticado", async () => {
    const res = await request(server)
  .put("/api/user/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Novo Nome", whatsapp: "+5511999999999", address: { street: "Nova Rua", number: "2", neighborhood: "Bairro Novo", cep: "87654321" } });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Confirma atualização
    const updated = await userModel.findById(user._id).lean();
    expect(updated.name).toBe("Novo Nome");
    expect(updated.whatsapp).toBe("+5511999999999");
    expect(updated.address.street).toBe("Nova Rua");
  });

  it("deve negar acesso sem token", async () => {
  const res = await request(server).get("/api/user/profile");
    expect(res.status).toBe(401);
  });
});
