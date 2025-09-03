// Australian-specific validation utilities

export const australianStates = [
  { code: 'NSW', name: 'New South Wales' },
  { code: 'VIC', name: 'Victoria' },
  { code: 'QLD', name: 'Queensland' },
  { code: 'WA', name: 'Western Australia' },
  { code: 'SA', name: 'South Australia' },
  { code: 'TAS', name: 'Tasmania' },
  { code: 'ACT', name: 'Australian Capital Territory' },
  { code: 'NT', name: 'Northern Territory' }
];

export const validateAustralianPhone = (phone: string): boolean => {
  // Remove all non-digit characters
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Australian phone number patterns:
  // Mobile: 04XX XXX XXX (10 digits starting with 04)
  // Landline: 0X XXXX XXXX (10 digits starting with 02, 03, 07, 08)
  // International format: +61 X XXXX XXXX (removing +61 and adding 0)
  
  if (cleanPhone.startsWith('61') && cleanPhone.length === 11) {
    // International format (+61), convert to domestic
    const domesticPhone = '0' + cleanPhone.substring(2);
    return validateAustralianPhone(domesticPhone);
  }
  
  if (cleanPhone.length !== 10) return false;
  
  // Must start with 0
  if (!cleanPhone.startsWith('0')) return false;
  
  // Valid area codes
  const validAreaCodes = ['02', '03', '04', '07', '08'];
  const areaCode = cleanPhone.substring(0, 2);
  
  return validAreaCodes.includes(areaCode);
};

export const formatAustralianPhone = (phone: string): string => {
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Convert international format
  if (cleanPhone.startsWith('61') && cleanPhone.length === 11) {
    const domesticPhone = '0' + cleanPhone.substring(2);
    return formatAustralianPhone(domesticPhone);
  }
  
  if (cleanPhone.length === 10 && cleanPhone.startsWith('0')) {
    if (cleanPhone.startsWith('04')) {
      // Mobile: 04XX XXX XXX
      return `${cleanPhone.substring(0, 4)} ${cleanPhone.substring(4, 7)} ${cleanPhone.substring(7)}`;
    } else {
      // Landline: 0X XXXX XXXX
      return `${cleanPhone.substring(0, 2)} ${cleanPhone.substring(2, 6)} ${cleanPhone.substring(6)}`;
    }
  }
  
  return phone; // Return original if can't format
};

export const validateAustralianPostcode = (postcode: string, state: string): boolean => {
  const code = parseInt(postcode);
  
  if (isNaN(code) || postcode.length !== 4) return false;
  
  const postcodeRanges: Record<string, number[][]> = {
    'NSW': [[1000, 1999], [2000, 2599], [2619, 2899], [2921, 2999]],
    'ACT': [[200, 299], [2600, 2618], [2900, 2920]],
    'VIC': [[3000, 3999], [8000, 8999]],
    'QLD': [[4000, 4999], [9000, 9999]],
    'SA': [[5000, 5999]],
    'WA': [[6000, 6999]],
    'TAS': [[7000, 7999]],
    'NT': [[800, 999]]
  };
  
  const ranges = postcodeRanges[state];
  if (!ranges) return false;
  
  return ranges.some(([min, max]) => code >= min && code <= max);
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  return validateAustralianPhone(phone);
};

export const validateABN = (abn: string): boolean => {
  // Australian Business Number - 11 digits
  const cleanABN = abn.replace(/\s/g, '');
  return /^\d{11}$/.test(cleanABN);
};