import React, { useEffect, useState, useContext } from "react";
import "./Zones.css";
import axios from "axios";
import { toast } from "react-toastify";
import { StoreContext } from "../../context/StoreContext";
import { useNavigate } from "react-router-dom";
import { getAdminTranslation } from "../../constants/adminTranslations";

const Zones = ({ url }) => {
  const navigate = useNavigate();
  const { token, admin } = useContext(StoreContext);
  const [zones, setZones] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    neighborhoods: [""]
  });

  const fetchZones = async () => {
    try {
      const response = await axios.get(`${url}/api/zone/`, {
        headers: { token }
      });
      if (response.data.success) {
        setZones(response.data.data);
      } else {
        toast.error(getAdminTranslation('zones.errorFetchingZones', 'Error fetching zones'));
      }
    } catch (error) {
      toast.error(getAdminTranslation('zones.errorFetchingZones', 'Error fetching zones'));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNeighborhoodChange = (index, value) => {
    const newNeighborhoods = [...formData.neighborhoods];
    newNeighborhoods[index] = value;
    setFormData(prev => ({
      ...prev,
      neighborhoods: newNeighborhoods
    }));
  };

  const addNeighborhoodField = () => {
    setFormData(prev => ({
      ...prev,
      neighborhoods: [...prev.neighborhoods, ""]
    }));
  };

  const removeNeighborhoodField = (index) => {
    if (formData.neighborhoods.length > 1) {
      const newNeighborhoods = formData.neighborhoods.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        neighborhoods: newNeighborhoods
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.name.trim()) {
      toast.error(getAdminTranslation('zones.zoneNameRequired', 'Zone name is required'));
      return;
    }
    
    const validNeighborhoods = formData.neighborhoods.filter(n => n.trim() !== "");
    if (validNeighborhoods.length === 0) {
      toast.error(getAdminTranslation('zones.atLeastOneNeighborhood', 'At least one neighborhood is required'));
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        neighborhoods: validNeighborhoods
      };

      let response;
      if (editingZone) {
        response = await axios.put(`${url}/api/zone/${editingZone._id}`, payload, {
          headers: { token }
        });
      } else {
        response = await axios.post(`${url}/api/zone/`, payload, {
          headers: { token }
        });
      }

      if (response.data.success) {
        toast.success(response.data.message);
        setShowForm(false);
        setEditingZone(null);
        setFormData({ name: "", neighborhoods: [""] });
        fetchZones();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || getAdminTranslation('zones.errorSavingZone', 'Error saving zone'));
    }
  };

  const handleEdit = (zone) => {
    setEditingZone(zone);
    setFormData({
      name: zone.name,
      neighborhoods: zone.neighborhoods.length > 0 ? zone.neighborhoods : [""]
    });
    setShowForm(true);
  };

  const handleDelete = async (zoneId) => {
    if (window.confirm(getAdminTranslation('zones.confirmDelete', 'Are you sure you want to delete this zone?'))) {
      try {
        const response = await axios.delete(`${url}/api/zone/${zoneId}`, {
          headers: { token }
        });
        if (response.data.success) {
          toast.success(response.data.message);
          fetchZones();
        } else {
          toast.error(response.data.message);
        }
      } catch (error) {
        toast.error(error.response?.data?.message || getAdminTranslation('zones.errorDeletingZone', 'Error deleting zone'));
      }
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingZone(null);
    setFormData({ name: "", neighborhoods: [""] });
  };

  useEffect(() => {
    if (!admin && !token) {
      toast.error(getAdminTranslation('authentication.pleaseLoginFirst', 'Please Login First'));
      navigate("/");
    } else {
      fetchZones();
    }
  }, []);

  return (
    <div className="zones add flex-col">
      <div className="zones-header">
        <h3>{getAdminTranslation('zones.deliveryZonesManagement', 'Delivery Zones Management')}</h3>
        <button 
          className="add-zone-btn"
          onClick={() => setShowForm(true)}
          disabled={showForm}
        >
          {getAdminTranslation('zones.addNewZone', 'Add New Zone')}
        </button>
      </div>

      {showForm && (
        <div className="zone-form-container">
          <form onSubmit={handleSubmit} className="zone-form flex-col">
            <h4>{editingZone ? getAdminTranslation('zones.editZone', 'Edit Zone') : getAdminTranslation('zones.addNewZone', 'Add New Zone')}</h4>
            
            <div className="form-group flex-col">
              <label>{getAdminTranslation('zones.zoneName', 'Zone Name')}</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder={getAdminTranslation('zones.enterZoneName', 'Enter zone name')}
                required
              />
            </div>

            <div className="form-group flex-col">
              <label>{getAdminTranslation('zones.neighborhoods', 'Neighborhoods')}</label>
              {formData.neighborhoods.map((neighborhood, index) => (
                <div key={index} className="neighborhood-input">
                  <input
                    type="text"
                    value={neighborhood}
                    onChange={(e) => handleNeighborhoodChange(index, e.target.value)}
                    placeholder={getAdminTranslation('zones.enterNeighborhoodName', 'Enter neighborhood name')}
                  />
                  {formData.neighborhoods.length > 1 && (
                    <button
                      type="button"
                      className="remove-btn"
                      onClick={() => removeNeighborhoodField(index)}
                    >
                      {getAdminTranslation('zones.remove', 'Remove')}
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="add-neighborhood-btn"
                onClick={addNeighborhoodField}
              >
                {getAdminTranslation('zones.addNeighborhood', 'Add Neighborhood')}
              </button>
            </div>

            <div className="form-actions">
              <button type="submit" className="submit-btn">
                {editingZone ? getAdminTranslation('zones.updateZone', 'Update Zone') : getAdminTranslation('zones.createZone', 'Create Zone')}
              </button>
              <button type="button" className="cancel-btn" onClick={cancelForm}>
                {getAdminTranslation('zones.cancel', 'Cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="zones-list">
        <div className="zones-table">
          <div className="zones-table-format title">
            <b>{getAdminTranslation('zones.zoneName', 'Zone Name')}</b>
            <b>{getAdminTranslation('zones.neighborhoods', 'Neighborhoods')}</b>
            <b>{getAdminTranslation('zones.status', 'Status')}</b>
            <b>{getAdminTranslation('zones.actions', 'Actions')}</b>
          </div>
          {zones.map((zone, index) => (
            <div key={index} className="zones-table-format">
              <p>{zone.name}</p>
              <div className="neighborhoods-list">
                {zone.neighborhoods.map((neighborhood, idx) => (
                  <span key={idx} className="neighborhood-tag">
                    {neighborhood}
                  </span>
                ))}
              </div>
              <p className={`status ${zone.isActive ? 'active' : 'inactive'}`}>
                {zone.isActive ? getAdminTranslation('zones.active', 'Active') : getAdminTranslation('zones.inactive', 'Inactive')}
              </p>
              <div className="zone-actions">
                <button 
                  className="edit-btn"
                  onClick={() => handleEdit(zone)}
                  disabled={showForm}
                >
                  {getAdminTranslation('zones.edit', 'Edit')}
                </button>
                <button 
                  className="delete-btn"
                  onClick={() => handleDelete(zone._id)}
                  disabled={showForm}
                >
                  {getAdminTranslation('zones.delete', 'Delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
        {zones.length === 0 && (
          <div className="no-zones">
            <p>{getAdminTranslation('zones.noZonesFound', 'No zones found. Create your first delivery zone!')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Zones;