// Public contact details shown in the footer and on /contact. Leave a value empty to hide it.
// Support hotline and email.
export const SITE_CONTACT = {
  phone: "01540594034",
  email: "support@vendorshub.com",
} as const;

const PHONE = /^01\d{9}$/;
const EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i;

export const telHref = (phone: string) => (PHONE.test(phone) ? `tel:+88${phone}` : null);
export const mailtoHref = (email: string) => (EMAIL.test(email) ? `mailto:${email}` : null);
