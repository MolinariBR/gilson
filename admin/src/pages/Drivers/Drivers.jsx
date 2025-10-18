import React from "react";
import "./Drivers.css";
import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useEffect } from "react";
import { assets } from "../../assets/assets";
import { useContext } from "react";
import { StoreContext } from "../../context/StoreContext";
import { useNavigate } from "react-router-dom";
import { getAdminTranslation } from "../../constants/adminTranslations";

const Drivers = ({ url }) => {
  const navigate = useNavigate();
  const { token, admin } = useContext(StoreContext);
  const [drivers, setDrivers] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    whatsapp: '',
    status: 'active'
  });

  const fetchAllDrivers = async () => {
    try {
      const response = await axios.get(url + "/api/drivers", {
        headers: { token },
      });
      if (response.data.success) {
        setDrivers(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
      toast.error(getAdminTranslation('drivers.errorLoading', 'Error loading drivers'));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      whatsapp: '',
      status: 'active'
    });
    setEditingDriver(null);
    setShowAddForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.phone || !formData.whatsapp) {
      toast.error(getAdminTranslation('drivers.fillAllFields', 'Please fill all fields'));
      return;
    }

    try {
      let response;
      if (editingDriver) {
        response = await axios.put(
          url + `/api/admin/drivers/${editingDriver._id}`,
          formData,
          { headers: { token } }
        );
      } else {
        response = await axios.post(
          url + "/api/admin/drivers",
          formData,
          { headers: { token } }
        );
      }

      if (response.data.success) {
        toast.success(
          editingDriver
            ? getAdminTranslation('drivers.updated', 'Driver updated successfully')
            : getAdminTranslation('drivers.added', 'Driver added successfully')
        );
        resetForm();
        await fetchAllDrivers();
      } else {
        toast.error(response.data.message || getAdminTranslation('drivers.error', 'Error saving driver'));
      }
    } catch (error) {
      console.error('Error saving driver:', error);
      toast.error(getAdminTranslation('drivers.error', 'Error saving driver'));
    }
  };

  const handleEdit = (driver) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name,
      phone: driver.phone,
      whatsapp: driver.whatsapp,
      status: driver.status
    });
    setShowAddForm(true);
  };

  const handleDelete = async (driverId) => {
    if (!window.confirm(getAdminTranslation('drivers.confirmDelete', 'Are you sure you want to delete this driver?'))) {
      return;
    }

    try {
      const response = await axios.delete(
        url + `/api/admin/drivers/${driverId}`,
        { headers: { token } }
      );

      if (response.data.success) {
        toast.success(getAdminTranslation('drivers.deleted', 'Driver deleted successfully'));
        await fetchAllDrivers();
      } else {
        toast.error(response.data.message || getAdminTranslation('drivers.errorDeleting', 'Error deleting driver'));
      }
    } catch (error) {
      console.error('Error deleting driver:', error);
      toast.error(getAdminTranslation('drivers.errorDeleting', 'Error deleting driver'));
    }
  };

  useEffect(() => {
    if (!admin && !token) {
      toast.error(getAdminTranslation('authentication.pleaseLoginFirst', 'Please Login First'));
      navigate("/");
    }
    fetchAllDrivers();
  }, []);

  return (
    <div className="drivers-page">
      <div className="drivers-header">
        <h3>{getAdminTranslation('drivers.driverManagement', 'Driver Management')}</h3>
        <button
          className="add-driver-btn"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? getAdminTranslation('drivers.cancel', 'Cancel') : getAdminTranslation('drivers.addDriver', 'Add Driver')}
        </button>
      </div>

      {showAddForm && (
        <form className="driver-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{getAdminTranslation('drivers.name', 'Name')}:</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label>{getAdminTranslation('drivers.phone', 'Phone')}:</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label>{getAdminTranslation('drivers.whatsapp', 'WhatsApp')}:</label>
            <input
              type="tel"
              name="whatsapp"
              value={formData.whatsapp}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label>{getAdminTranslation('drivers.status', 'Status')}:</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
            >
              <option value="active">{getAdminTranslation('drivers.active', 'Active')}</option>
              <option value="inactive">{getAdminTranslation('drivers.inactive', 'Inactive')}</option>
            </select>
          </div>

          <div className="form-actions">
            <button type="submit" className="submit-btn">
              {editingDriver ? getAdminTranslation('drivers.update', 'Update') : getAdminTranslation('drivers.add', 'Add')}
            </button>
            <button type="button" className="cancel-btn" onClick={resetForm}>
              {getAdminTranslation('drivers.cancel', 'Cancel')}
            </button>
          </div>
        </form>
      )}

      <div className="drivers-list">
        {drivers.length === 0 ? (
          <p className="no-drivers">{getAdminTranslation('drivers.noDrivers', 'No drivers found')}</p>
        ) : (
          drivers.map((driver) => (
            <div key={driver._id} className="driver-item">
              <div className="driver-info">
                <h4>{driver.name}</h4>
                <p><strong>{getAdminTranslation('drivers.phone', 'Phone')}:</strong> {driver.phone}</p>
                <p><strong>{getAdminTranslation('drivers.whatsapp', 'WhatsApp')}:</strong> {driver.whatsapp}</p>
                <p><strong>{getAdminTranslation('drivers.status', 'Status')}:</strong>
                  <span className={`status ${driver.status}`}>
                    {driver.status === 'active' ? getAdminTranslation('drivers.active', 'Active') : getAdminTranslation('drivers.inactive', 'Inactive')}
                  </span>
                </p>
              </div>
              <div className="driver-actions">
                <button
                  className="edit-btn"
                  onClick={() => handleEdit(driver)}
                >
                  {getAdminTranslation('drivers.edit', 'Edit')}
                </button>
                <button
                  className="delete-btn"
                  onClick={() => handleDelete(driver._id)}
                >
                  {getAdminTranslation('drivers.delete', 'Delete')}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Drivers;