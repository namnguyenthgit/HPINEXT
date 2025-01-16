export const appConfig = {
    title: 'HPI-Next',
    description: 'Hoang Phuc International management system',
    icon: "/icons/logo.svg",
    baseurl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    cookie_name: 'hpinext-session'
    //others
} as const;


export const lsretailConfig = {
    title: 'LSRetail',
    description: 'Hoang Phuc International LS Retail',
    baseurl: process.env.LSRETAIL_BASE_URL,
    token: process.env.LSRETAIL_TOKEN,
} as const;