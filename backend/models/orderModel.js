import mongoose from "mongoose";
import { mongoosePhoneValidator, getPhoneValidationError } from "../utils/phoneValidation.js";

const orderSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  items: { 
    type: Array, 
    required: true,
    validate: {
      validator: function(items) {
        return Array.isArray(items) && items.length > 0;
      },
      message: 'Items array cannot be empty'
    }
  },
  amount: { type: Number, required: true },
  phone: { 
    type: String, 
    required: false, // Telefone não é obrigatório
    validate: {
      validator: function(value) {
        // Se não tem valor, é válido (opcional)
        if (!value) return true;
        // Se tem valor, valida
        return mongoosePhoneValidator(value);
      },
      message: function(props) {
        return getPhoneValidationError(props.value);
      }
    }
  },
  address: {
    street: { type: String, required: true },
    number: { type: String, required: true },
    neighborhood: { type: String, required: true },
    zone: { type: String, required: true },
    cep: { type: String, required: false },
    customerName: { type: String, required: false }
  },
  status: { type: String, default: "Pending" },
  createdAt: { 
    type: Date, 
    default: Date.now
  },
  printHistory: [{
    printedAt: { type: Date, default: Date.now },
    printedBy: { type: String, required: true },
    copies: { type: Number, default: 1, min: 1 },
    paperSize: { type: String, enum: ['58mm', '80mm'], default: '80mm' }
  }],
  // Keep the old date field for backward compatibility during migration
  date: { type: Date, default: Date.now },
  payment: { type: Boolean, default: false },
  mercadoPagoId: { type: String }
});

// Configure schema options for enhanced timestamp handling
orderSchema.set('toJSON', { 
  transform: function(doc, ret) {
    // Ensure createdAt is properly formatted in JSON responses
    if (ret.createdAt && ret.createdAt instanceof Date) {
      const date = ret.createdAt;
      ret.createdAt = {
        day: date.getDate(),
        month: date.getMonth() + 1,
        year: date.getFullYear(),
        hour: date.getHours(),
        minute: date.getMinutes(),
        second: date.getSeconds(),
        iso: date.toISOString(),
        timestamp: date.getTime()
      };
    }
    return ret;
  }
});

// Add instance methods for enhanced functionality
orderSchema.methods.addPrintRecord = function(printedBy, copies = 1, paperSize = '80mm') {
  this.printHistory.push({
    printedAt: new Date(),
    printedBy,
    copies,
    paperSize
  });
  return this.save();
};

orderSchema.methods.getFormattedTimestamp = function() {
  // Get the raw Date object from the document
  const date = this._doc.createdAt || this.createdAt;
  if (!date || !(date instanceof Date)) return null;
  
  return {
    day: date.getDate(),
    month: date.getMonth() + 1,
    year: date.getFullYear(),
    hour: date.getHours(),
    minute: date.getMinutes(),
    second: date.getSeconds(),
    iso: date.toISOString(),
    timestamp: date.getTime(),
    formatted: date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  };
};

orderSchema.methods.getPrintCount = function() {
  return this.printHistory.reduce((total, record) => total + record.copies, 0);
};

orderSchema.methods.getLastPrintDate = function() {
  if (this.printHistory.length === 0) return null;
  return this.printHistory[this.printHistory.length - 1].printedAt;
};

const orderModel =
  mongoose.models.order || mongoose.model("order", orderSchema);

export default orderModel;
