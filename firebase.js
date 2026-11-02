/* Firebase compartido con Clase en directo y el test (proyecto «recursos-para-clases», Realtime Database en la UE).
   Nodos del muro: walls/{código} (ajustes del muro), teacherWalls/{uid}/{código} (lista de la docente),
   wallPosts/{código}/{id} (aportaciones publicadas), wallQueue/{código}/{uid}/{id} (pendientes u ocultas),
   wallLikes/{código}/{id}/{uid}, wallComments/{código}/{id}/{idComentario}. Reglas: firebase-reglas-muro.json. */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInAnonymously, signOut, onAuthStateChanged, updateProfile } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getDatabase, ref, get, set, update, remove, push, onValue, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

export const firebaseConfig = {
  apiKey: 'AIzaSyCAZ5zeEQrRMRa-ATz3EZtt_AKbZ0HpSjk',
  authDomain: 'recursos-para-clases.firebaseapp.com',
  databaseURL: 'https://recursos-para-clases-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'recursos-para-clases',
  appId: '1:228868139413:web:64ad459a100a3f259f6e9c'
};
export const DOMINIO = 'nervion.salesianas.org';
export const NOMBRE_APP = 'Muro';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export { ref, get, set, update, remove, push, onValue, serverTimestamp, signOut, onAuthStateChanged };

export async function entrarGoogle(soloColegio) {
  const p = new GoogleAuthProvider();
  p.setCustomParameters(soloColegio ? { hd: DOMINIO, prompt: 'select_account' } : { prompt: 'select_account' });
  return (await signInWithPopup(auth, p)).user;
}
export async function entrarSinCuenta(nombre) {
  const u = (await signInAnonymously(auth)).user;
  try { await updateProfile(u, { displayName: nombre }); } catch (e) { /* no importa */ }
  return u;
}
export const esColegio = u => !!(u && u.email && u.emailVerified && u.email.toLowerCase().endsWith('@' + DOMINIO));

export function mensajeError(e) {
  const c = (e && (e.code || e.message)) || String(e);
  if (/PERMISSION_DENIED|permission/i.test(c)) return 'No tienes permiso para esto. Revisa la cuenta con la que has entrado o si el muro está cerrado.';
  if (/popup-closed|cancelled-popup/i.test(c)) return 'Se ha cerrado la ventana de Google antes de terminar.';
  if (/popup-blocked/i.test(c)) return 'El navegador ha bloqueado la ventana de Google: permite las ventanas emergentes para esta web.';
  if (/unauthorized-domain/i.test(c)) return 'Esta web aún no está autorizada en Firebase (Authentication → Dominios autorizados).';
  if (/admin-restricted|operation-not-allowed/i.test(c)) return 'La entrada sin cuenta no está activada en Firebase.';
  if (/network/i.test(c)) return 'No hay conexión. Comprueba internet y vuelve a intentarlo.';
  return 'Algo ha fallado: ' + c;
}
