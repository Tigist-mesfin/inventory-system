const { parsePhoneNumberFromString } = require('libphonenumber-js');
module.exports = (phone) => {
  if (!phone) return null;
  const parsed = parsePhoneNumberFromString(phone, 'ET');
  if (!parsed?.isValid()) return null;
  return parsed.number.replace('+', '');
};
