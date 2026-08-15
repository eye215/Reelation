import{getVerifiedUser,supabase}from'./supabase-client.js?v=auth-32';

document.documentElement.dataset.auth='checking';
const user=await getVerifiedUser();
window.__REELATION_AUTH_USER_ID__=user?.id||null;
window.__REELATION_SUPABASE__=supabase;
document.documentElement.dataset.auth=user?'authenticated':'anonymous';
await import('./app.js?v=auth-32');
