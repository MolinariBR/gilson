/**
 * Admin phone validation utilities for Brazilian phone numbers
 * Supports both mobile (11 digits) and landline (10 digits) formats
 */

import { getAdminTranslation } from '../constants/adminTranslations';

/**
 * Brazilian phone number patterns
 */
export const PHONE_PATTERNS = {
  // Mobile: (11) 99999-9999 - 11 digits with 9 as first digit of number
  MOBILE: /^\(\d{2}\)\s9\d{4}-\d{4}$/,
  
  // Landline: (11) 9999-9999 - 10 digits
  LANDLINE: /^\(\d{2}\)\s\d{4}-\d{4}$/,
  
  // Combined pattern for both mobile and landline
  COMBINED: /^\(\d{2}\)\s\d{4,5}-\d{4}$/,
  
  // Raw number patterns (digits only)
  RAW_MOBILE: /^(\d{2})9\d{8}$/,
  RAW_LANDLINE: /^(\d{2})[2-8]\d{7}$/,
  RAW_COMBINED: /^(\d{2})(\d{8}|9\d{8})$/
};

/**
 * Valid Brazilian area codes (DDD)
 */
export const VALID_AREA_CODES = [
  '11', '12', '13', '14', '15', '16', '17', '18', '19', // São Paulo
  '21', '22', '24', // Rio de Janeiro
  '27', '28', // Espírito Santo
  '31', '32', '33', '34', '35', '37', '38', // Minas Gerais
  '41', '42', '43', '44', '45', '46', // Paraná
  '47', '48', '49', // Santa Catarina
  '51', '53', '54', '55', // Rio Grande do Sul
  '61', // Distrito Federal
  '62', '64', // Goiás
  '63', // Tocantins
  '65', '66', // Mato Grosso
  '67', // Mato Grosso do Sul
  '68', // Acre
  '69', // Rondônia
  '71', '73', '74', '75', '77', // Bahia
  '79', // Sergipe
  '81', '87', // Pernambuco
  '82', // Alagoas
  '83', // Paraíba
  '84', // Rio Grande do Norte
  '85', '88', // Ceará
  '86', '89', // Piauí
  '91', '93', '94', // Pará
  '92', '97', // Amazonas
  '95', // Roraima
  '96', // Amapá
  '98', '99' // Maranhão
];

/**
 * Sanitize phone number by removing all non-digit characters
 * @param {string} phone - Phone number to sanitize
 * @returns {string} Phone number with only digits
 */
export const sanitizePhone = (phone) => {
  if (!phone || typeof phone !== 'string') {
    return '';
  }
  return phone.replace(/\D/g, '');
};

/**
 * Format phone number to Brazilian standard format
 * @param {string} phone - Phone number to format (can be raw digits or already formatted)
 * @returns {string} Formatted phone number or original if invalid
 */
export const formatPhone = (phone) => {
  if (!phone || typeof phone !== 'string') {
    return '';
  }

  const cleaned = sanitizePhone(phone);
  
  // Mobile number (11 digits)
  if (cleaned.length === 11 && cleaned[2] === '9') {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  
  // Landline number (10 digits)
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  
  // Return original if can't format
  return phone;
};

/**
 * Validate if phone number is in correct Brazilian format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid, false otherwise
 */
export const isValidPhone = (phone) => {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  // Check if already formatted
  if (PHONE_PATTERNS.COMBINED.test(phone)) {
    const areaCode = phone.slice(1, 3);
    return VALID_AREA_CODES.includes(areaCode);
  }

  // Check raw digits
  const cleaned = sanitizePhone(phone);
  if (PHONE_PATTERNS.RAW_COMBINED.test(cleaned)) {
    const areaCode = cleaned.slice(0, 2);
    return VALID_AREA_CODES.includes(areaCode);
  }

  return false;
};

/**
 * Validate if phone number is a mobile number
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if mobile, false otherwise
 */
export const isMobilePhone = (phone) => {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  // Check formatted mobile
  if (PHONE_PATTERNS.MOBILE.test(phone)) {
    const areaCode = phone.slice(1, 3);
    return VALID_AREA_CODES.includes(areaCode);
  }

  // Check raw mobile
  const cleaned = sanitizePhone(phone);
  if (PHONE_PATTERNS.RAW_MOBILE.test(cleaned)) {
    const areaCode = cleaned.slice(0, 2);
    return VALID_AREA_CODES.includes(areaCode);
  }

  return false;
};

/**
 * Mask phone number for display (security purposes)
 * Shows only area code and last 4 digits
 * @param {string} phone - Phone number to mask
 * @returns {string} Masked phone number
 */
export const maskPhone = (phone) => {
  if (!phone || typeof phone !== 'string') {
    return '';
  }

  const cleaned = sanitizePhone(phone);
  
  if (cleaned.length === 11) {
    // Mobile: (11) 9****-9999
    return `(${cleaned.slice(0, 2)}) ${cleaned[2]}****-${cleaned.slice(7)}`;
  }
  
  if (cleaned.length === 10) {
    // Landline: (11) ****-9999
    return `(${cleaned.slice(0, 2)}) ****-${cleaned.slice(6)}`;
  }
  
  return phone;
};

/**
 * Get phone type (mobile, landline, or invalid)
 * @param {string} phone - Phone number to analyze
 * @returns {string} 'mobile', 'landline', or 'invalid'
 */
export const getPhoneType = (phone) => {
  if (isMobilePhone(phone)) {
    return 'mobile';
  }
  if (isValidPhone(phone)) {
    return 'landline';
  }
  return 'invalid';
};

/**
 * Phone validation examples for documentation/help
 */
export const PHONE_EXAMPLES = {
  mobile: {
    formatted: '(11) 99999-9999',
    raw: '11999999999'
  },
  landline: {
    formatted: '(11) 9999-9999',
    raw: '1199999999'
  }
};