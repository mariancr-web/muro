import { auth, db, ref, get, set, update, remove, push, onValue, serverTimestamp, signOut, onAuthStateChanged, entrarGoogle, entrarSinCuenta, esColegio, mensajeError, NOMBRE_APP } from './firebase.js';
import { esc, rico, colorCurso, nombreClase, pintarPost, pintarTablero, pintarFormulario, activarFormulario, leerFormulario, verImagen, nuevoId, ICO } from './comun.js';

const app = document.getElementById('app');
const dlg = document.getElementById('dlg');
const $ = s => app.querySelector(s);
let U = null;
let limpiar = [];
const reset = () => { limpiar.forEach(f => { try { f(); } catch { } }); limpiar = []; if (dlg.open) dlg.close(); };

const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch { } };
const leer = k => { try { return localStorage.getItem(k) || ''; } catch { return ''; } };
const limpiarCodigo = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);

const params = new URLSearchParams(location.search);
let codigo = limpiarCodigo(params.get('m') || params.get('c') || '');
const nombreDe = u => u.displayName || (u.email ? u.email.split('@')[0] : 'Alumno/a');

function marco(html, cab = '') {
  return `<header class="mcr-barra">
    <a class="mcr-barra__marca" href="./"><img src="logo-negativo.svg" alt="mariancr"><span class="mcr-barra__nombre">${esc(NOMBRE_APP)}</span></a>
    <div class="mcr-barra__usuario">${U ? `<span class="barra-nombre">${esc(nombreDe(U))}</span><button class="mcr-btn mcr-btn--peq" id="salir" type="button">Salir</button>` : ''}</div>
  </header>${cab}<main class="mcr-contenedor contenido">${html}</main>
  <footer class="mcr-pie-app">mariancr · ${esc(NOMBRE_APP)}</footer>`;
}
app.addEventListener('click', e => { if (e.target.closest('#salir')) { guardar('muro-codigo', ''); signOut(auth); } });

// ── Entrada ─────────────────────────────────────────────────────
function pantallaEntrada(error = '') {
  reset(); colorCurso('');
  document.body.classList.add('mcr-trama-tenue');
  app.innerHTML = `<div class="mcr-acceso"><section class="mcr-acceso__tarjeta">
    <img src="logo.svg" alt="mariancr">
    <span class="etiqueta">Muro colaborativo</span>
    <h1>Entrar en el muro</h1>
    <label class="campo"><span class="campo__nombre">Código del muro</span>
      <input id="cod" class="input-codigo" maxlength="6" autocomplete="off" autocapitalize="characters" value="${esc(codigo)}" placeholder="ABC123"></label>
    <button class="mcr-btn mcr-btn--prim mcr-btn--ancho" id="google" type="button">Entrar con la cuenta del colegio</button>
    <details class="sin-cuenta"><summary>Entrar sin cuenta</summary>
      <p class="campo__ayuda">Solo si tu profesora lo ha permitido en este muro.</p>
      <label class="campo"><span class="campo__nombre">Tu nombre y apellidos</span><input id="nom" maxlength="60" autocomplete="name"></label>
      <button class="mcr-btn mcr-btn--ancho" id="anon" type="button">Entrar sin cuenta</button>
    </details>
    <p class="aviso" id="err" role="alert">${esc(error)}</p>
    <div class="mcr-acceso__docente"><a href="profesor.html">Acceso docente</a></div>
  </section></div>`;
  const cod = $('#cod');
  cod.oninput = () => { cod.value = limpiarCodigo(cod.value); };
  const pedirCodigo = () => { codigo = limpiarCodigo(cod.value); if (codigo.length !== 6) { $('#err').textContent = 'Escribe el código de 6 caracteres que te ha dado tu profesora.'; cod.focus(); return false; } guardar('muro-codigo', codigo); return true; };
  $('#google').onclick = async () => { if (!pedirCodigo()) return; try { await entrarGoogle(true); } catch (e) { $('#err').textContent = mensajeError(e); } };
  $('#anon').onclick = async () => {
    if (!pedirCodigo()) return;
    const n = $('#nom').value.trim();
    if (n.length < 3) { $('#err').textContent = 'Escribe tu nombre y apellidos.'; return; }
    try { await entrarSinCuenta(n); } catch (e) { $('#err').textContent = mensajeError(e); }
  };
}

function pantallaCodigo(error = '') {
  reset(); colorCurso('');
  document.body.classList.add('mcr-trama-tenue');
  app.innerHTML = `<div class="mcr-acceso"><section class="mcr-acceso__tarjeta">
    <img src="logo.svg" alt="mariancr">
    <span class="etiqueta">Muro colaborativo</span>
    <h1>¿A qué muro vas?</h1>
    <p>Has entrado como <b>${esc(U.email || nombreDe(U))}</b>.</p>
    <label class="campo"><span class="campo__nombre">Código del muro</span>
      <input id="cod" class="input-codigo" maxlength="6" autocomplete="off" value="${esc(codigo)}" placeholder="ABC123"></label>
    <button class="mcr-btn mcr-btn--prim mcr-btn--ancho" id="ir" type="button">Entrar</button>
    <p class="aviso" id="err" role="alert">${esc(error)}</p>
    <div class="mcr-acceso__docente"><button class="enlace-boton" id="salir" type="button">Usar otra cuenta</button></div>
  </section></div>`;
  const cod = $('#cod');
  cod.oninput = () => { cod.value = limpiarCodigo(cod.value); };
  const ir = () => { codigo = limpiarCodigo(cod.value); if (codigo.length !== 6) { $('#err').textContent = 'El código tiene 6 caracteres.'; return; } guardar('muro-codigo', codigo); abrirMuro(); };
  $('#ir').onclick = ir;
  cod.onkeydown = e => { if (e.key === 'Enter') ir(); };
}

// ── Muro ────────────────────────────────────────────────────────
async function abrirMuro() {
  reset();
  document.body.classList.remove('mcr-trama-tenue');
  app.innerHTML = '<p class="vacio">Cargando el muro…</p>';
  let w;
  try { w = (await get(ref(db, `walls/${codigo}`))).val(); }
  catch (e) {
    if (U.isAnonymous) return pantallaEntradaTrasError('Este muro no admite entrar sin cuenta, o el código no es correcto. Entra con la cuenta del colegio.');
    if (!esColegio(U)) return pantallaEntradaTrasError(`Has entrado con ${U.email}. Entra con tu cuenta @nervion.salesianas.org.`);
    return pantallaCodigo(mensajeError(e));
  }
  if (!w) return U.isAnonymous ? pantallaEntradaTrasError('No hay ningún muro con ese código.') : pantallaCodigo('No hay ningún muro con ese código.');
  history.replaceState(null, '', `?m=${codigo}`);

  const E = { w, posts: {}, likes: {}, coms: {}, mios: {}, abiertos: new Set(), borradores: {} };
  const escuchar = (ruta, f) => { const off = onValue(ref(db, ruta), s => { f(s.val() || {}); pintar(); }, () => { }); limpiar.push(off); };
  escuchar(`walls/${codigo}`, v => { E.w = v && v.owner ? v : E.w; });
  escuchar(`wallPosts/${codigo}`, v => { E.posts = v; });
  escuchar(`wallLikes/${codigo}`, v => { E.likes = v; });
  escuchar(`wallComments/${codigo}`, v => { E.coms = v; });
  escuchar(`wallQueue/${codigo}/${U.uid}`, v => { E.mios = v; });

  let programado = false;
  function pintar() {
    if (programado) return; programado = true;
    requestAnimationFrame(() => { programado = false; dibujar(E); });
  }
  pintar();
  limpiar.push(() => { app.onclick = null; app.onsubmit = null; app.oninput = null; });
  app.onclick = e => clic(e, E);
  app.onsubmit = e => enviarComentario(e, E);
  app.oninput = e => { const f = e.target.closest('[data-com-form]'); if (f) E.borradores[f.closest('.post').dataset.id] = e.target.value; };
  const reloj = setInterval(pintar, 60000);
  limpiar.push(() => clearInterval(reloj));
}

function pantallaEntradaTrasError(msg) { signOut(auth); pantallaEntrada(msg); }

function misPublicadas(E) { return Object.values(E.posts).filter(p => p.uid === U.uid).length; }
function puedePublicar(E) {
  const w = E.w;
  if (!w.abierto) return false;
  const max = Number(w.maxPorAlumno) || 0;
  return !max || misPublicadas(E) + Object.values(E.mios).filter(p => !p.hidden).length < max;
}

function dibujar(E) {
  const w = E.w;
  colorCurso(w.curso);
  const y = scrollY;
  const posts = Object.entries(E.posts).map(([id, p]) => ({ ...p, id }));
  const pendientes = Object.entries(E.mios).map(([id, p]) => ({ ...p, id }));
  const abierto = !!w.abierto;
  const tarjeta = p => pintarPost(p, {
    w, uid: U.uid, likes: E.likes[p.id], comentarios: E.coms[p.id], puedeComentar: abierto,
    acciones: p.uid === U.uid && abierto ? `${w.editar !== false ? '<button class="mcr-btn mcr-btn--peq" data-editar type="button">Editar</button>' : ''}<button class="mcr-btn mcr-btn--peq mcr-btn--peligro" data-borrar type="button">Borrar</button>` : ''
  });
  const max = Number(w.maxPorAlumno) || 0;
  const cab = `<section class="mcr-trama-banda"><div class="mcr-contenedor mcr-hero">
    <div class="hero-chips"><span class="chip-clase">${esc(nombreClase(w.curso, w.grupo))}</span>${abierto ? '<span class="mcr-vivo">Abierto</span>' : '<span class="pildora-cerrado">Cerrado</span>'}</div>
    <h1>${rico(w.titulo || 'Muro')}</h1>
    ${w.descripcion ? `<div class="hero-desc">${rico(w.descripcion)}</div>` : ''}
    <div class="mcr-hero__fila"><span class="hero-meta">${posts.length} ${posts.length === 1 ? 'aportación' : 'aportaciones'}${w.moderacion ? ' · la profesora revisa cada aportación antes de publicarla' : ''}${max ? ` · máximo ${max} por persona` : ''}</span>
    ${abierto && puedePublicar(E) ? `<button class="mcr-btn mcr-btn--prim boton-claro" data-nueva="" type="button">${ICO.mas} Añadir aportación</button>` : ''}</div>
  </div></section>`;
  const pend = pendientes.length ? `<section class="mis-pendientes"><h2 class="mcr-seccion">Tus aportaciones sin publicar</h2>
    <div class="tablero tablero--muro">${pendientes.map(p => pintarPost(p, { w, uid: U.uid, pendiente: !p.hidden, oculta: !!p.hidden,
      acciones: abierto ? `${!p.hidden ? '<button class="mcr-btn mcr-btn--peq" data-editar-pend type="button">Editar</button>' : ''}<button class="mcr-btn mcr-btn--peq mcr-btn--peligro" data-borrar-pend type="button">Borrar</button>` : '' })).join('')}</div></section>` : '';
  const vacio = !posts.length ? `<div class="mcr-vacio">Todavía no hay aportaciones.${abierto && puedePublicar(E) ? ' <button class="mcr-btn mcr-btn--prim" data-nueva="" type="button">Sé el primero</button>' : ''}</div>` : '';
  app.innerHTML = marco(`${pend}${!abierto ? '<p class="nota-cerrado">El muro está cerrado: puedes verlo, pero ya no se puede publicar.</p>' : ''}
    ${vacio}${posts.length || w.formato === 'columnas' ? pintarTablero(posts, w, tarjeta, { botonColumna: abierto && puedePublicar(E) }) : ''}
    ${abierto && puedePublicar(E) ? `<button class="fab" data-nueva="" type="button" aria-label="Añadir aportación">${ICO.mas}</button>` : ''}`, cab);
  // Restaurar comentarios abiertos y borradores
  E.abiertos.forEach(id => { const c = app.querySelector(`.post[data-id="${CSS.escape(id)}"] .post__coms`); if (c) c.hidden = false; });
  Object.entries(E.borradores).forEach(([id, t]) => { const i = app.querySelector(`.post[data-id="${CSS.escape(id)}"] [data-com-form] input`); if (i) i.value = t; });
  scrollTo(0, y);
}

async function clic(e, E) {
  const t = e.target;
  const post = t.closest('.post');
  const id = post?.dataset.id;
  try {
    if (t.closest('[data-ver-img]')) return verImagen(t.closest('[data-ver-img]').querySelector('img').src);
    if (t.closest('[data-nueva]')) return formulario(E, null, t.closest('[data-nueva]').dataset.nueva || '');
    if (t.closest('[data-like]')) {
      const r = ref(db, `wallLikes/${codigo}/${id}/${U.uid}`);
      return (E.likes[id] || {})[U.uid] ? remove(r) : set(r, true);
    }
    if (t.closest('[data-coms]')) {
      const c = post.querySelector('.post__coms'); c.hidden = !c.hidden;
      c.hidden ? E.abiertos.delete(id) : E.abiertos.add(id);
      if (!c.hidden) c.querySelector('input')?.focus();
      return;
    }
    if (t.closest('[data-borrar-com]')) return remove(ref(db, `wallComments/${codigo}/${id}/${t.closest('[data-borrar-com]').dataset.borrarCom}`));
    if (t.closest('[data-editar]')) return formulario(E, { ...E.posts[id], id }, '', false);
    if (t.closest('[data-editar-pend]')) return formulario(E, { ...E.mios[id], id }, '', true);
    if (t.closest('[data-borrar]')) {
      if (!confirmar('¿Borrar tu aportación?')) return;
      return borrarPublicada(id);
    }
    if (t.closest('[data-borrar-pend]')) {
      if (!confirmar('¿Borrar tu aportación?')) return;
      return remove(ref(db, `wallQueue/${codigo}/${U.uid}/${id}`));
    }
  } catch (err) { aviso(mensajeError(err)); }
}

// Las confirmaciones nativas bloquean poco y funcionan en todos los móviles
const confirmar = m => window.confirm(m);

async function borrarPublicada(id) {
  const u = {};
  u[`wallPosts/${codigo}/${id}`] = null;
  await update(ref(db), u);
  // Sus «me gusta» y comentarios los limpia la profesora al borrar el muro; aquí se intenta y si no hay permiso no pasa nada
}

async function enviarComentario(e, E) {
  const f = e.target.closest('[data-com-form]');
  if (!f) return;
  e.preventDefault();
  const id = f.closest('.post').dataset.id;
  const text = f.elements.t.value.trim();
  if (!text) return;
  try {
    await set(push(ref(db, `wallComments/${codigo}/${id}`)), { uid: U.uid, name: nombreDe(U).slice(0, 60), text: text.slice(0, 500), at: serverTimestamp() });
    delete E.borradores[id];
  } catch (err) { aviso(mensajeError(err)); }
}

function aviso(msg) {
  let a = document.getElementById('toast');
  if (!a) { a = document.createElement('div'); a.id = 'toast'; a.className = 'toast'; a.setAttribute('role', 'status'); document.body.appendChild(a); }
  a.textContent = msg; a.classList.add('on');
  clearTimeout(aviso.t); aviso.t = setTimeout(() => a.classList.remove('on'), 4000);
}

// previo: aportación a editar (con id); enCola: si está en la cola de pendientes
function formulario(E, previo, col = '', enCola = false) {
  const w = E.w;
  dlg.className = 'dlg-post';
  dlg.innerHTML = `<div class="dlg__cab"><h2>${previo ? 'Editar aportación' : 'Nueva aportación'}</h2><button class="dlg__cerrar" type="button" aria-label="Cerrar">×</button></div>
    ${pintarFormulario(w, previo || {}, col)}
    <div class="dlg__pie">${w.moderacion ? '<span class="campo__ayuda">La profesora la revisará antes de publicarla.</span>' : ''}
    <button class="mcr-btn" type="button" data-cancelar>Cancelar</button><button class="mcr-btn mcr-btn--prim" type="button" data-publicar>${w.moderacion ? 'Enviar' : 'Publicar'}</button></div>`;
  const form = dlg.querySelector('form');
  activarFormulario(form);
  const cerrar = () => dlg.close();
  dlg.querySelector('.dlg__cerrar').onclick = cerrar;
  dlg.querySelector('[data-cancelar]').onclick = cerrar;
  form.onsubmit = e => { e.preventDefault(); publicar(); };
  const btn = dlg.querySelector('[data-publicar]');
  btn.onclick = publicar;
  async function publicar() {
    const r = leerFormulario(form, E.w);
    const err = form.querySelector('.aviso');
    if (r.error) { err.textContent = r.error; return; }
    if (!E.w.abierto) { err.textContent = 'El muro se acaba de cerrar.'; return; }
    btn.disabled = true; btn.textContent = 'Enviando…';
    const datos = { uid: U.uid, name: nombreDe(U).slice(0, 60), email: U.isAnonymous ? '' : String(U.email || '').toLowerCase(), v: r.v };
    if (r.col) datos.col = r.col;
    try {
      const id = previo?.id || nuevoId();
      if (previo) { datos.at = previo.at || serverTimestamp(); datos.edited = true; if (previo.pinned && !E.w.moderacion) datos.pinned = true; }
      else datos.at = serverTimestamp();
      const u = {};
      if (E.w.moderacion) {
        u[`wallQueue/${codigo}/${U.uid}/${id}`] = datos;
        if (previo && !enCola) u[`wallPosts/${codigo}/${id}`] = null; // al editar con moderación vuelve a revisión
      } else {
        u[`wallPosts/${codigo}/${id}`] = datos;
      }
      await update(ref(db), u);
      dlg.close();
      aviso(E.w.moderacion ? 'Enviada. Aparecerá cuando la profesora la revise.' : 'Publicada.');
    } catch (e) { err.textContent = mensajeError(e); btn.disabled = false; btn.textContent = E.w.moderacion ? 'Enviar' : 'Publicar'; }
  }
  dlg.showModal();
  form.querySelector('input:not([type=hidden]):not([type=file]), textarea, select')?.focus();
}

// ── Arranque ────────────────────────────────────────────────────
if (!codigo) codigo = leer('muro-codigo');
onAuthStateChanged(auth, u => {
  U = u;
  if (!u) return pantallaEntrada();
  if (!codigo) return pantallaCodigo();
  abrirMuro();
});
