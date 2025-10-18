import React, { useContext, useEffect, useState } from "react";
import "./Profile.css";
import { StoreContext } from "../../context/StoreContext";
import { toast } from "react-toastify";
import { TRANSLATIONS } from "../../constants/translations";

const Profile = () => {
  const { token, user, setUser, api } = useContext(StoreContext);
  const [form, setForm] = useState({
    name: user?.name || "",
    whatsapp: user?.whatsapp || "",
    address: user?.address || {
      street: "",
      number: "",
      neighborhood: "",
      cep: ""
    }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Carregar dados do perfil do usuário
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const res = await api.get("/user/profile", { headers: { Authorization: token } });
        setForm(res.data);
      } catch (err) {
        toast.error("Erro ao carregar perfil");
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchProfile();
  }, [token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("address.")) {
      setForm({
        ...form,
        address: { ...form.address, [name.split(".")[1]]: value }
      });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put("/user/profile", form, { headers: { Authorization: token } });
      setUser({ ...user, ...form });
      toast.success("Perfil atualizado com sucesso!");
    } catch (err) {
      toast.error("Erro ao atualizar perfil");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-container">
      <h2>{TRANSLATIONS.profile.title}</h2>
      <form className="profile-form" onSubmit={handleSubmit}>
        <label>Nome
          <input name="name" value={form.name} onChange={handleChange} required />
        </label>
        <label>WhatsApp
          <input name="whatsapp" value={form.whatsapp} onChange={handleChange} required pattern="^\+?55\d{11}$" placeholder="+5599999999999" />
        </label>
        <fieldset>
          <legend>Endereço</legend>
          <input name="address.street" value={form.address.street} onChange={handleChange} placeholder="Rua" required />
          <input name="address.number" value={form.address.number} onChange={handleChange} placeholder="Número" required />
          <input name="address.neighborhood" value={form.address.neighborhood} onChange={handleChange} placeholder="Bairro" required />
          <input name="address.cep" value={form.address.cep} onChange={handleChange} placeholder="CEP" required />
        </fieldset>
        <button type="submit" disabled={loading}>{loading ? "Salvando..." : "Salvar alterações"}</button>
      </form>
    </div>
  );
};

export default Profile;
