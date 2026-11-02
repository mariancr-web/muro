import { auth, db, ref, get, set, update, remove, push, onValue, serverTimestamp, signOut, onAuthStateChanged, entrarGoogle, mensajeError, NOMBRE_APP } from './firebase.js';
import { esc, rico, CLASES, colorCurso, nombreClase, claseDe, pintarPost, pintarTablero, pintarFormulario, activarFormulario, leerFormulario, verImagen, nuevoCodigo, nuevoId, ICO, TIPOS_CAMPO, FORMATOS, ajustesPorDefecto, camposPorDefecto, listaCampos, listaColumnas, fecha, ordenar } from './comun.js';

const app = document.getElementById('app');
const dlg = document.getElementById('dlg');
const $ = s => app.querySelector(s);
let U = null;
let limpiar = [];
function reset() {
  limpiar.forEach(f => { try { f(); } catch { } }); limpiar = [];
  app.onclick = null; app.onsubmit = null; app.oninput = null; app.onchange = null;
  document.body.classList.remove('modo-proyector', 'mcr-trama-tenue');
  document.onkeydown = null;
  if (dlg.open) dlg.close();
}
const guardarLocal = (k, v) => { try { localStorage.setItem(k, v); } catch { } };
const leerLocal = k => { try { return localStorage.getItem(k) || ''; } catch { return ''; } };

function marco(html, cab = '') {
  return `<header class="mcr-barra">
    <a class="mcr-barra__marca" href="#/"><img src="logo-negativo.svg" alt="mariancr"><span class="mcr-barra__nombre">${esc(NOMBRE_APP)}</span></a>
    <div class="mcr-barra__usuario"><span class="barra-nombre">${esc(U?.displayName || U?.email || '')}</span><button class="mcr-btn mcr-btn--peq" id="salir" type="button">Salir</button></div>
  </header>${cab}<main class="mcr-contenedor contenido">${html}</main>
  <footer class="mcr-pie-app">mariancr · ${esc(NOMBRE_APP)}</footer>`;
}
document.addEventListener('click', e => { if (e.target.closest('#salir')) signOut(auth); });

function aviso(msg) {
  let a = document.getElementById('toast');
  if (!a) { a = document.createElement('div'); a.id = 'toast'; a.className = 'toast'; a.setAttribute('role', 'status'); document.body.appendChild(a); }
  a.textContent = msg; a.classList.add('on');
  clearTimeout(aviso.t); aviso.t = setTimeout(() => a.classList.remove('on'), 4000);
}
const enlaceAlumno = code => { const u = new URL('./', location.href); u.search = `?m=${code}`; u.hash = ''; return u.href; };
const enlaceCorto = code => { const u = new URL(enlaceAlumno(code)); return u.host + u.pathname.replace(/index\.html$/, ''); };

// ── Acceso ──────────────────────────────────────────────────────
function pantallaLogin(err = '') {
  reset(); colorCurso('');
  document.body.classList.add('mcr-trama-tenue');
  app.innerHTML = `<div class="mcr-acceso"><section class="mcr-acceso__tarjeta">
    <img src="logo.svg" alt="mariancr">
    <span class="etiqueta">Profesorado</span>
    <h1>Muro colaborativo</h1>
    <p>Crea muros para tus clases, decide qué rellena el alumnado y modera lo que se publica.</p>
    <button class="mcr-btn mcr-btn--prim mcr-btn--ancho" id="google" type="button">Entrar con Google</button>
    <p class="aviso" id="err" role="alert">${esc(err)}</p>
    <div class="mcr-acceso__docente"><a href="./">Entrada del alumnado</a></div></section></div>`;
  $('#google').onclick = async () => { try { await entrarGoogle(false); } catch (e) { $('#err').textContent = mensajeError(e); } };
}
function pantallaSinPermiso(user) {
  reset();
  document.body.classList.add('mcr-trama-tenue');
  app.innerHTML = `<div class="mcr-acceso"><section class="mcr-acceso__tarjeta">
    <h1>Falta un paso</h1>
    <p>Has entrado como ${esc(user.email)}, pero esta cuenta no está autorizada como docente. Es la misma autorización que en Clase en directo: en Firebase, Realtime Database, dentro de <code>teachers</code>, crea una clave con este identificador y el valor <code>true</code>.</p>
    <p class="uid"><code>${esc(user.uid)}</code></p>
    <button class="mcr-btn" id="salir" type="button">Usar otra cuenta</button></section></div>`;
}

// ── Inicio: lista de muros ──────────────────────────────────────
const FILTROS = [{ id: 'todas', nombre: 'Todas', curso: 'general' }, ...CLASES.map(c => ({ id: c.id, nombre: c.nombre, curso: c.curso })), { id: 'sin', nombre: 'Sin curso', curso: 'sin' }];

function pantallaInicio() {
  reset();
  let filtro = leerLocal('muro-filtro') || 'todas';
  if (!FILTROS.some(f => f.id === filtro)) filtro = 'todas';
  let muros = null;
  const off = onValue(ref(db, `teacherWalls/${U.uid}`), s => { muros = s.val() || {}; pintar(); }, e => { app.innerHTML = marco(`<p class="aviso">${esc(mensajeError(e))}</p>`); });
  limpiar.push(off);
  function pintar() {
    const f = FILTROS.find(x => x.id === filtro);
    document.body.classList.remove(...[...document.body.classList].filter(c => c.startsWith('curso-')));
    document.body.classList.add('curso-' + f.curso);
    const lista = Object.entries(muros || {}).map(([code, m]) => ({ code, ...m })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const tarjeta = m => `<li class="mcr-tarjeta ${m.abierto ? 'mcr-tarjeta--vivo' : 'mcr-tarjeta--fin'}">
      <div><a class="mcr-tarjeta__titulo" href="#/m/${m.code}">${rico(m.titulo || 'Sin título')}</a>
      <div class="mcr-tarjeta__meta">${m.abierto ? '<span class="mcr-vivo">Abierto</span> · ' : 'Cerrado · '}${esc(nombreClase(m.curso, m.grupo))} · código <b class="codigo-txt">${m.code}</b> · ${esc(fecha(m.createdAt))}</div></div>
      <div class="mcr-tarjeta__acc"><a class="mcr-btn mcr-btn--peq mcr-btn--prim" href="#/m/${m.code}">Abrir</a><a class="mcr-btn mcr-btn--peq" href="#/p/${m.code}">Proyectar</a>
      <button class="mcr-btn mcr-btn--peq" data-duplicar="${m.code}" type="button">Duplicar</button><button class="mcr-btn mcr-btn--peq mcr-btn--peligro" data-borrar="${m.code}" type="button">Borrar</button></div></li>`;
    let cuerpo;
    if (muros === null) cuerpo = '<p class="vacio">Cargando…</p>';
    else if (filtro === 'todas') {
      const grupos = FILTROS.slice(1).map(g => ({ g, ms: lista.filter(m => claseDe(m) === g.id) })).filter(x => x.ms.length);
      let abiertos = {}; try { abiertos = JSON.parse(leerLocal('muro-grupos') || '{}'); } catch { }
      cuerpo = grupos.length ? `<div class="mcr-grupos">${grupos.map(({ g, ms }, i) => `<details class="mcr-grupo curso-${g.curso}" data-grupo="${g.id}"${abiertos[g.id] ?? i === 0 ? ' open' : ''}>
        <summary><span class="mcr-grupo__chip">${esc(g.nombre)}</span><span class="mcr-grupo__nombre">${esc(CLASES.find(c => c.id === g.id)?.materia || '')}</span><span class="mcr-grupo__n">${ms.length}</span></summary>
        <ul class="mcr-lista">${ms.map(tarjeta).join('')}</ul></details>`).join('')}</div>`
        : `<div class="mcr-vacio">Aún no has creado ningún muro.<a class="mcr-btn mcr-btn--prim" href="#/nuevo">Crear el primer muro</a></div>`;
    } else {
      const ms = lista.filter(m => claseDe(m) === filtro);
      cuerpo = ms.length ? `<h2 class="mcr-seccion">Muros de ${esc(f.nombre)}</h2><ul class="mcr-lista">${ms.map(tarjeta).join('')}</ul>`
        : `<div class="mcr-vacio">No hay muros de ${esc(f.nombre)}.<a class="mcr-btn mcr-btn--prim" href="#/nuevo?clase=${filtro}">Crear un muro para ${esc(f.nombre)}</a></div>`;
    }
    app.innerHTML = marco(cuerpo, `<section class="mcr-trama-banda"><div class="mcr-contenedor mcr-hero">
      <div class="mcr-filtros" role="group" aria-label="Clase">${FILTROS.map(x => `<button class="mcr-filtro curso-${x.curso}" data-filtro="${x.id}" aria-pressed="${x.id === filtro}" type="button">${esc(x.nombre)}</button>`).join('')}</div>
      <div class="mcr-hero__fila"><h1>Muros colaborativos</h1><a class="mcr-btn mcr-btn--prim boton-claro" href="#/nuevo${filtro !== 'todas' && filtro !== 'sin' ? `?clase=${filtro}` : ''}">${ICO.mas} Nuevo muro</a></div>
    </div></section>`);
    app.querySelectorAll('details[data-grupo]').forEach(d => d.addEventListener('toggle', () => {
      let a = {}; try { a = JSON.parse(leerLocal('muro-grupos') || '{}'); } catch { }
      a[d.dataset.grupo] = d.open; guardarLocal('muro-grupos', JSON.stringify(a));
    }));
  }
  app.onclick = async e => {
    const t = e.target;
    const fb = t.closest('[data-filtro]');
    if (fb) { filtro = fb.dataset.filtro; guardarLocal('muro-filtro', filtro); return pintar(); }
    const dup = t.closest('[data-duplicar]');
    if (dup) {
      try {
        const w = (await get(ref(db, `walls/${dup.dataset.duplicar}`))).val();
        const code = await guardarMuro(null, { ...w, titulo: (w.titulo || 'Muro') + ' (copia)' });
        location.hash = `#/editar/${code}`;
      } catch (err) { aviso(mensajeError(err)); }
      return;
    }
    const bor = t.closest('[data-borrar]');
    if (bor) {
      const code = bor.dataset.borrar;
      if (!confirm(`¿Borrar el muro ${code} y todas sus aportaciones? No se puede deshacer.`)) return;
      try { await borrarMuro(code); aviso('Muro borrado.'); } catch (err) { aviso(mensajeError(err)); }
    }
  };
}

async function borrarMuro(code) {
  const u = {};
  for (const n of ['wallPosts', 'wallQueue', 'wallLikes', 'wallComments']) u[`${n}/${code}`] = null;
  u[`teacherWalls/${U.uid}/${code}`] = null;
  await update(ref(db), u);
  await remove(ref(db, `walls/${code}`));
}

// Guarda los ajustes. Si code es null, crea un muro nuevo con código libre.
async function guardarMuro(code, w) {
  const datos = { ...ajustesPorDefecto(), ...w };
  delete datos.owner; delete datos.createdAt; delete datos.updatedAt;
  datos.campos = listaCampos(datos).map(c => ({ ...c }));
  datos.columnas = listaColumnas(datos).map(c => ({ ...c }));
  if (!code) {
    for (let i = 0; i < 8 && !code; i++) {
      const c = nuevoCodigo();
      try { if (!(await get(ref(db, `walls/${c}`))).exists()) code = c; }
      catch { /* sin permiso de lectura: probar otro código */ }
    }
    if (!code) throw new Error('No se ha podido generar un código. Inténtalo de nuevo.');
    datos.createdAt = serverTimestamp();
  } else {
    const prev = (await get(ref(db, `walls/${code}`))).val();
    datos.createdAt = prev?.createdAt || serverTimestamp();
  }
  datos.owner = U.uid;
  datos.updatedAt = serverTimestamp();
  await set(ref(db, `walls/${code}`), datos);
  await set(ref(db, `teacherWalls/${U.uid}/${code}`), { titulo: datos.titulo, curso: datos.curso || '', grupo: datos.grupo || '', abierto: !!datos.abierto, createdAt: datos.createdAt });
  return code;
}

// ── Editor de ajustes ───────────────────────────────────────────
async function pantallaEditor(code, claseInicial) {
  reset();
  app.innerHTML = marco('<p class="vacio">Cargando…</p>');
  let w;
  if (code) {
    try { w = (await get(ref(db, `walls/${code}`))).val(); } catch (e) { app.innerHTML = marco(`<p class="aviso">${esc(mensajeError(e))}</p>`); return; }
    if (!w) { app.innerHTML = marco('<div class="mcr-vacio">Ese muro no existe. <a class="mcr-btn" href="#/">Volver</a></div>'); return; }
  } else {
    w = ajustesPorDefecto();
    const c = CLASES.find(x => x.id === claseInicial);
    if (c) { w.curso = c.curso; w.grupo = c.grupo; }
  }
  w.campos = listaCampos(w).map(c => ({ ...c }));
  w.columnas = listaColumnas(w).map(c => ({ ...c }));
  const E = { w };
  pintarEditor(E, code);
}

function pintarEditor(E, code) {
  const w = E.w;
  colorCurso(w.curso);
  const claseSel = claseDe(w);
  const casilla = (k, txt, ayuda = '') => `<label class="casilla"><input type="checkbox" data-op="${k}"${w[k] ? ' checked' : ''}><span><b>${txt}</b>${ayuda ? `<span class="campo__ayuda">${ayuda}</span>` : ''}</span></label>`;
  app.innerHTML = marco(`<div class="editor">
    <form class="editor__form" id="ed" novalidate>
      <h2 class="mcr-seccion">Datos del muro</h2>
      <label class="campo"><span class="campo__nombre">Título</span><input id="titulo" maxlength="120" value="${esc(w.titulo)}" placeholder="Por ejemplo: ¿Dónde vemos reacciones químicas en casa?" data-formula></label>
      <label class="campo"><span class="campo__nombre">Instrucciones para el alumnado <span class="campo__ayuda">(opcional; admite fórmulas)</span></span><textarea id="desc" rows="3" maxlength="1500" data-formula>${esc(w.descripcion)}</textarea></label>
      <label class="campo"><span class="campo__nombre">Clase</span><select id="clase">${CLASES.map(c => `<option value="${c.id}"${claseSel === c.id ? ' selected' : ''}>${esc(c.nombre)} · ${esc(c.materia)}</option>`).join('')}<option value="sin"${claseSel === 'sin' ? ' selected' : ''}>Sin curso</option></select></label>

      <h2 class="mcr-seccion">Formato</h2>
      <div class="formatos" role="radiogroup">${Object.entries(FORMATOS).map(([k, f]) => `<label class="formato${w.formato === k ? ' on' : ''}"><input type="radio" name="formato" value="${k}"${w.formato === k ? ' checked' : ''}><span class="formato__dibujo formato__dibujo--${k}" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span><b>${f.nombre}</b><span class="campo__ayuda">${f.desc}</span></label>`).join('')}</div>
      ${w.formato === 'columnas' ? `<div class="sublista" id="cols"><span class="campo__nombre">Columnas</span>
        ${w.columnas.map((c, i) => `<div class="fila" data-i="${i}"><input data-col-nombre value="${esc(c.nombre)}" maxlength="60" aria-label="Nombre de la columna ${i + 1}" placeholder="Nombre de la columna">
        <button class="mcr-btn mcr-btn--peq" data-col-sube type="button" aria-label="Subir"${i ? '' : ' disabled'}>↑</button><button class="mcr-btn mcr-btn--peq" data-col-baja type="button" aria-label="Bajar"${i < w.columnas.length - 1 ? '' : ' disabled'}>↓</button><button class="mcr-btn mcr-btn--peq mcr-btn--peligro" data-col-quita type="button" aria-label="Quitar">×</button></div>`).join('')}
        <button class="mcr-btn mcr-btn--peq" data-col-nueva type="button">${ICO.mas} Añadir columna</button></div>` : ''}

      <h2 class="mcr-seccion">Qué rellena el alumnado</h2>
      <p class="campo__ayuda">Cada aportación es un pequeño formulario. Cambia los nombres, añade campos propios (por ejemplo «Fuente», «Resultado», «Elemento elegido») y marca los obligatorios.</p>
      <div class="sublista" id="campos">
        ${w.campos.map((c, i) => `<div class="campo-def" data-i="${i}">
          <div class="fila"><input data-c-nombre value="${esc(c.nombre)}" maxlength="60" aria-label="Nombre del campo ${i + 1}" placeholder="Nombre del campo">
          <select data-c-tipo aria-label="Tipo">${Object.entries(TIPOS_CAMPO).map(([k, n]) => `<option value="${k}"${c.tipo === k ? ' selected' : ''}>${n}</option>`).join('')}</select>
          <button class="mcr-btn mcr-btn--peq" data-c-sube type="button" aria-label="Subir"${i ? '' : ' disabled'}>↑</button><button class="mcr-btn mcr-btn--peq" data-c-baja type="button" aria-label="Bajar"${i < w.campos.length - 1 ? '' : ' disabled'}>↓</button><button class="mcr-btn mcr-btn--peq mcr-btn--peligro" data-c-quita type="button" aria-label="Quitar">×</button></div>
          <div class="fila fila--sub"><label class="casilla casilla--peq"><input type="checkbox" data-c-oblig${c.obligatorio ? ' checked' : ''}><span>Obligatorio</span></label>
          ${['corto', 'largo', 'numero', 'opciones'].includes(c.tipo) ? `<label class="casilla casilla--peq"><input type="checkbox" data-c-sinet${c.sinEtiqueta ? ' checked' : ''}><span>Ocultar el nombre en la tarjeta</span></label>` : ''}
          <input data-c-ayuda value="${esc(c.ayuda || '')}" maxlength="140" placeholder="Ayuda para el alumnado (opcional)" aria-label="Ayuda"></div>
          ${c.tipo === 'opciones' ? `<textarea data-c-opciones rows="3" placeholder="Una opción por línea" aria-label="Opciones">${esc(c.opciones || '')}</textarea>` : ''}
        </div>`).join('')}
        <div class="fila"><button class="mcr-btn mcr-btn--peq" data-c-nuevo type="button">${ICO.mas} Añadir campo</button><button class="mcr-btn mcr-btn--peq" data-c-defecto type="button">Volver a los campos por defecto</button></div>
      </div>

      <h2 class="mcr-seccion">Opciones</h2>
      <div class="opciones">
        ${casilla('abierto', 'Muro abierto', 'Si lo cierras, se puede ver pero no publicar.')}
        ${casilla('moderacion', 'Revisar antes de publicar', 'Las aportaciones no se ven hasta que las apruebes.')}
        ${casilla('nombres', 'Mostrar los nombres a la clase', 'Tú siempre ves quién ha publicado cada cosa.')}
        ${casilla('meGusta', 'Permitir «me gusta»')}
        ${casilla('comentarios', 'Permitir comentarios')}
        ${casilla('editar', 'El alumnado puede editar sus aportaciones')}
        ${casilla('guests', 'Permitir entrar sin cuenta', 'Para quien no pueda entrar con la cuenta del colegio. Solo escriben su nombre.')}
        <label class="campo campo--linea"><span class="campo__nombre">Máximo de aportaciones por alumno</span><input id="max" type="number" min="0" max="50" value="${Number(w.maxPorAlumno) || 0}"><span class="campo__ayuda">0 = sin límite</span></label>
        <label class="campo campo--linea"><span class="campo__nombre">Orden</span><select id="orden"><option value="recientes"${w.orden !== 'antiguos' ? ' selected' : ''}>Las más recientes primero</option><option value="antiguos"${w.orden === 'antiguos' ? ' selected' : ''}>Las más antiguas primero</option></select></label>
      </div>
      <p class="aviso" id="err" role="alert"></p>
      <div class="editor__acciones"><a class="mcr-btn" href="${code ? `#/m/${code}` : '#/'}">Cancelar</a><button class="mcr-btn mcr-btn--prim" id="guardar" type="button">${code ? 'Guardar cambios' : 'Crear muro'}</button></div>
    </form>
    <aside class="editor__vista"><h2 class="mcr-seccion">Lo que verá el alumnado</h2><div class="vista-movil"><div class="vista-movil__cab">Nueva aportación</div><div id="vista"></div></div></aside>
  </div>`, `<section class="mcr-trama-banda"><div class="mcr-contenedor mcr-hero"><h1>${code ? 'Ajustes del muro' : 'Nuevo muro'}</h1>${code ? `<p class="hero-meta">Código ${code}</p>` : ''}</div></section>`);
  vista();

  function vista() {
    const v = $('#vista');
    v.innerHTML = pintarFormulario(E.w);
    activarFormulario(v.querySelector('form'));
  }
  const leerDatos = () => {
    const ed = $('#ed');
    w.titulo = $('#titulo').value.trim();
    w.descripcion = $('#desc').value.trim();
    const c = CLASES.find(x => x.id === $('#clase').value);
    w.curso = c ? c.curso : ''; w.grupo = c ? c.grupo : '';
    w.maxPorAlumno = Math.max(0, Math.min(50, parseInt($('#max').value, 10) || 0));
    w.orden = $('#orden').value;
    ed.querySelectorAll('[data-op]').forEach(i => { w[i.dataset.op] = i.checked; });
    ed.querySelectorAll('#cols .fila[data-i]').forEach(f => { w.columnas[+f.dataset.i].nombre = f.querySelector('[data-col-nombre]').value; });
    ed.querySelectorAll('.campo-def').forEach(f => {
      const c = w.campos[+f.dataset.i];
      c.nombre = f.querySelector('[data-c-nombre]').value;
      c.obligatorio = f.querySelector('[data-c-oblig]').checked;
      const se = f.querySelector('[data-c-sinet]'); c.sinEtiqueta = se ? se.checked : false;
      c.ayuda = f.querySelector('[data-c-ayuda]').value.trim();
      const op = f.querySelector('[data-c-opciones]'); if (op) c.opciones = op.value;
    });
  };
  const mover = (arr, i, d) => { const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; };
  app.oninput = e => { if (e.target.closest('#ed')) { leerDatos(); if (e.target.closest('#campos, #cols')) vista(); } };
  app.onchange = e => {
    const t = e.target;
    leerDatos();
    if (t.name === 'formato') { w.formato = t.value; if (w.formato === 'columnas' && !w.columnas.length) w.columnas = [{ id: nuevoId(), nombre: 'Columna 1' }, { id: nuevoId(), nombre: 'Columna 2' }]; return pintarEditor(E, code); }
    if (t.matches('[data-c-tipo]')) { const c = w.campos[+t.closest('.campo-def').dataset.i]; c.tipo = t.value; if (c.tipo === 'opciones' && !c.opciones) c.opciones = 'Opción 1\nOpción 2'; return pintarEditor(E, code); }
    if (t.id === 'clase') colorCurso(w.curso);
    vista();
  };
  app.onclick = async e => {
    const t = e.target.closest('button');
    if (!t) return;
    const fila = t.closest('[data-i]'); const i = fila ? +fila.dataset.i : -1;
    if (t.matches('[data-col-nueva]')) { leerDatos(); w.columnas.push({ id: nuevoId(), nombre: `Columna ${w.columnas.length + 1}` }); return pintarEditor(E, code); }
    if (t.matches('[data-col-sube]')) { leerDatos(); mover(w.columnas, i, -1); return pintarEditor(E, code); }
    if (t.matches('[data-col-baja]')) { leerDatos(); mover(w.columnas, i, 1); return pintarEditor(E, code); }
    if (t.matches('[data-col-quita]')) { leerDatos(); w.columnas.splice(i, 1); return pintarEditor(E, code); }
    if (t.matches('[data-c-nuevo]')) { leerDatos(); w.campos.push({ id: nuevoId(), tipo: 'corto', nombre: 'Nuevo campo', obligatorio: false }); pintarEditor(E, code); app.querySelector('.campo-def:last-of-type [data-c-nombre]')?.select(); return; }
    if (t.matches('[data-c-defecto]')) { if (!confirm('¿Sustituir los campos por los de por defecto (título, texto, imagen y enlace)?')) return; w.campos = camposPorDefecto(); return pintarEditor(E, code); }
    if (t.matches('[data-c-sube]')) { leerDatos(); mover(w.campos, i, -1); return pintarEditor(E, code); }
    if (t.matches('[data-c-baja]')) { leerDatos(); mover(w.campos, i, 1); return pintarEditor(E, code); }
    if (t.matches('[data-c-quita]')) { leerDatos(); w.campos.splice(i, 1); return pintarEditor(E, code); }
    if (t.id === 'guardar') {
      leerDatos();
      const err = $('#err');
      if (!w.titulo) { err.textContent = 'Ponle un título al muro.'; $('#titulo').focus(); return; }
      if (!w.campos.length) { err.textContent = 'Añade al menos un campo para que el alumnado pueda escribir.'; return; }
      if (w.campos.some(c => !c.nombre.trim())) { err.textContent = 'Todos los campos necesitan un nombre.'; return; }
      if (w.formato === 'columnas' && (!w.columnas.length || w.columnas.some(c => !c.nombre.trim()))) { err.textContent = 'Pon nombre a todas las columnas.'; return; }
      w.campos.forEach(c => { c.nombre = c.nombre.trim(); if (c.tipo !== 'opciones') delete c.opciones; });
      t.disabled = true; t.textContent = 'Guardando…';
      try { const nuevo = await guardarMuro(code, w); location.hash = `#/m/${nuevo}`; }
      catch (er) { err.textContent = mensajeError(er); t.disabled = false; t.textContent = code ? 'Guardar cambios' : 'Crear muro'; }
    }
  };
}

// ── Muro (vista docente y proyector) ────────────────────────────
function pantallaMuro(code, proyector) {
  reset();
  app.innerHTML = marco('<p class="vacio">Cargando el muro…</p>');
  const E = { w: null, posts: {}, cola: {}, likes: {}, coms: {}, abiertos: new Set(), borradores: {}, verOcultas: false };
  let cargado = false;
  const escuchar = (ruta, f) => limpiar.push(onValue(ref(db, ruta), s => { f(s.val()); cargado = true; pintar(); }, e => { app.innerHTML = marco(`<p class="aviso">${esc(mensajeError(e))}</p>`); }));
  escuchar(`walls/${code}`, v => { E.w = v; });
  escuchar(`wallPosts/${code}`, v => { E.posts = v || {}; });
  escuchar(`wallQueue/${code}`, v => { E.cola = v || {}; });
  escuchar(`wallLikes/${code}`, v => { E.likes = v || {}; });
  escuchar(`wallComments/${code}`, v => { E.coms = v || {}; });
  let prog = false;
  function pintar() { if (prog) return; prog = true; requestAnimationFrame(() => { prog = false; if (!cargado) return; if (!E.w) { app.innerHTML = marco('<div class="mcr-vacio">Ese muro no existe o se ha borrado. <a class="mcr-btn" href="#/">Volver</a></div>'); return; } proyector ? dibujarProyector(E, code) : dibujarMuro(E, code); }); }
  const reloj = setInterval(pintar, 60000);
  limpiar.push(() => clearInterval(reloj));
  if (proyector) {
    document.body.classList.add('modo-proyector');
    document.onkeydown = e => { if (e.key === 'Escape') location.hash = `#/m/${code}`; };
    return;
  }
  app.onclick = e => clicMuro(e, E, code);
  app.onsubmit = e => comentar(e, E, code);
  app.oninput = e => { const f = e.target.closest('[data-com-form]'); if (f) E.borradores[f.closest('.post').dataset.id] = e.target.value; };
}

function colaPlana(E) {
  return Object.entries(E.cola || {}).flatMap(([uid, ps]) => Object.entries(ps || {}).map(([id, p]) => ({ ...p, id, uid: p.uid || uid })));
}

function dibujarMuro(E, code) {
  const w = E.w;
  colorCurso(w.curso);
  const y = scrollY;
  const posts = Object.entries(E.posts).map(([id, p]) => ({ ...p, id }));
  const cola = colaPlana(E);
  const pend = ordenar(cola.filter(p => !p.hidden), { orden: 'antiguos' });
  const ocultas = cola.filter(p => p.hidden);
  const tarjeta = p => pintarPost(p, {
    w, uid: U.uid, docente: true, likes: E.likes[p.id], comentarios: E.coms[p.id], puedeComentar: true,
    acciones: `<button class="mcr-btn mcr-btn--peq" data-fijar type="button">${p.pinned ? 'Soltar' : 'Fijar'}</button><button class="mcr-btn mcr-btn--peq" data-ocultar type="button">Ocultar</button><button class="mcr-btn mcr-btn--peq mcr-btn--peligro" data-borrar type="button">Borrar</button>`
  });
  const tog = (k, txt) => `<button class="mcr-btn mcr-btn--sec interruptor" data-toggle="${k}" aria-pressed="${!!w[k]}" type="button"><span class="interruptor__luz" aria-hidden="true"></span>${txt}</button>`;
  const cab = `<section class="mcr-trama-banda"><div class="mcr-contenedor mcr-hero">
    <div class="hero-chips"><a class="volver" href="#/">← Muros</a><span class="chip-clase">${esc(nombreClase(w.curso, w.grupo))}</span>${w.abierto ? '<span class="mcr-vivo">Abierto</span>' : '<span class="pildora-cerrado">Cerrado</span>'}<span class="codigo-hero">Código <b>${code}</b></span></div>
    <h1>${rico(w.titulo || 'Muro')}</h1>
    ${w.descripcion ? `<div class="hero-desc">${rico(w.descripcion)}</div>` : ''}
    <div class="mcr-hero__fila">
      <div class="interruptores">${tog('abierto', 'Abierto')}${tog('moderacion', 'Revisar antes')}${tog('nombres', 'Nombres visibles')}</div>
      <div class="hero-acciones">
        <button class="mcr-btn mcr-btn--prim boton-claro" data-compartir type="button">Compartir</button>
        <a class="mcr-btn mcr-btn--sec" href="#/p/${code}">Proyectar</a>
        <a class="mcr-btn mcr-btn--sec" href="#/editar/${code}">Ajustes</a>
        <button class="mcr-btn mcr-btn--sec" data-pdf type="button">PDF</button>
        <button class="mcr-btn mcr-btn--sec" data-csv type="button">Excel</button>
        <button class="mcr-btn mcr-btn--sec" data-nueva="" type="button">${ICO.mas} Publicar</button>
      </div>
    </div></div></section>`;
  const htmlPend = pend.length ? `<section class="pendientes"><h2 class="mcr-seccion">Pendientes de revisar <span class="contador">${pend.length}</span></h2>
    <div class="fila"><button class="mcr-btn mcr-btn--peq mcr-btn--prim" data-aprobar-todas type="button">Aprobar todas</button></div>
    <div class="tablero tablero--muro">${pend.map(p => pintarPost(p, { w, uid: U.uid, docente: true, pendiente: true,
      acciones: `<button class="mcr-btn mcr-btn--peq mcr-btn--prim" data-aprobar type="button">Aprobar</button><button class="mcr-btn mcr-btn--peq mcr-btn--peligro" data-rechazar type="button">Rechazar</button>` })).join('')}</div></section>` : '';
  const htmlOcultas = ocultas.length ? `<details class="ocultas"${E.verOcultas ? ' open' : ''}><summary>Ocultas (${ocultas.length})</summary>
    <div class="tablero tablero--muro">${ocultas.map(p => pintarPost(p, { w, uid: U.uid, docente: true, oculta: true,
      acciones: `<button class="mcr-btn mcr-btn--peq" data-aprobar type="button">Volver a mostrar</button><button class="mcr-btn mcr-btn--peq mcr-btn--peligro" data-rechazar type="button">Borrar</button>` })).join('')}</div></details>` : '';
  const vacio = !posts.length && w.formato !== 'columnas' ? `<div class="mcr-vacio">Todavía no hay aportaciones publicadas. Pulsa «Compartir» para mostrar el código y el QR a la clase.<button class="mcr-btn mcr-btn--prim" data-compartir type="button">Compartir</button></div>` : '';
  app.innerHTML = marco(`${htmlPend}${htmlOcultas}<h2 class="mcr-seccion">Publicadas <span class="contador">${posts.length}</span></h2>${vacio}
    ${posts.length || w.formato === 'columnas' ? pintarTablero(posts, w, tarjeta, { botonColumna: true }) : ''}`, cab);
  app.querySelector('.ocultas')?.addEventListener('toggle', ev => { E.verOcultas = ev.target.open; });
  E.abiertos.forEach(id => { const c = app.querySelector(`.post[data-id="${CSS.escape(id)}"] .post__coms`); if (c) c.hidden = false; });
  Object.entries(E.borradores).forEach(([id, t]) => { const i = app.querySelector(`.post[data-id="${CSS.escape(id)}"] [data-com-form] input`); if (i) i.value = t; });
  scrollTo(0, y);
}

function dibujarProyector(E, code) {
  const w = E.w;
  colorCurso(w.curso);
  const posts = Object.entries(E.posts).map(([id, p]) => ({ ...p, id }));
  const tarjeta = p => pintarPost(p, { w: { ...w, comentarios: false }, likes: E.likes[p.id], proyector: true });
  const yaQR = app.querySelector('.proy-qr');
  app.innerHTML = `<div class="proyector">
    <header class="proy-cab mcr-trama-banda"><img src="logo-negativo.svg" alt="mariancr"><div class="proy-titulo"><span class="chip-clase">${esc(nombreClase(w.curso, w.grupo))}</span><h1>${rico(w.titulo || 'Muro')}</h1></div>
    <div class="proy-acceso"><span>Entra en <b>${esc(enlaceCorto(code))}</b><br>con el código <b class="proy-codigo">${code}</b></span><div class="proy-qr" id="qr"></div></div>
    <a class="mcr-btn mcr-btn--sec proy-salir" href="#/m/${code}">Salir</a></header>
    <main class="proy-cuerpo">${posts.length || w.formato === 'columnas' ? pintarTablero(posts, w, tarjeta) : '<p class="proy-vacio">Esperando aportaciones…</p>'}</main></div>`;
  if (window.QRCode) new window.QRCode(app.querySelector('#qr'), { text: enlaceAlumno(code), width: 120, height: 120, colorDark: '#1E293B', colorLight: '#ffffff' });
  void yaQR;
}

async function clicMuro(e, E, code) {
  const t = e.target;
  const post = t.closest('.post');
  const id = post?.dataset.id;
  const uid = post?.dataset.uid;
  const w = E.w;
  try {
    if (t.closest('[data-ver-img]')) return verImagen(t.closest('[data-ver-img]').querySelector('img').src);
    const tg = t.closest('[data-toggle]');
    if (tg) {
      const k = tg.dataset.toggle; const val = !w[k];
      const u = { [`walls/${code}/${k}`]: val };
      if (k === 'abierto') u[`teacherWalls/${U.uid}/${code}/abierto`] = val;
      await update(ref(db), u);
      return aviso({ abierto: val ? 'Muro abierto.' : 'Muro cerrado: ya no se puede publicar.', moderacion: val ? 'Las nuevas aportaciones esperarán tu revisión.' : 'Las aportaciones se publican directamente.', nombres: val ? 'La clase ve los nombres.' : 'Los nombres quedan ocultos para la clase.' }[k]);
    }
    if (t.closest('[data-compartir]')) return compartir(code, w);
    if (t.closest('[data-pdf]')) return imprimir(E, code);
    if (t.closest('[data-csv]')) return descargarCSV(E, code);
    if (t.closest('[data-nueva]')) return publicarDocente(E, code, t.closest('[data-nueva]').dataset.nueva || '');
    if (t.closest('[data-like]')) { const r = ref(db, `wallLikes/${code}/${id}/${U.uid}`); return (E.likes[id] || {})[U.uid] ? remove(r) : set(r, true); }
    if (t.closest('[data-coms]')) { const c = post.querySelector('.post__coms'); c.hidden = !c.hidden; c.hidden ? E.abiertos.delete(id) : E.abiertos.add(id); return; }
    if (t.closest('[data-borrar-com]')) return remove(ref(db, `wallComments/${code}/${id}/${t.closest('[data-borrar-com]').dataset.borrarCom}`));
    if (t.closest('[data-fijar]')) { const p = E.posts[id]; return set(ref(db, `wallPosts/${code}/${id}/pinned`), p.pinned ? null : true); }
    if (t.closest('[data-ocultar]')) {
      const p = { ...E.posts[id] }; p.hidden = true; delete p.pinned;
      return update(ref(db), { [`wallQueue/${code}/${p.uid}/${id}`]: p, [`wallPosts/${code}/${id}`]: null });
    }
    if (t.closest('[data-borrar]')) {
      if (!confirm('¿Borrar esta aportación? No se puede deshacer.')) return;
      return update(ref(db), { [`wallPosts/${code}/${id}`]: null, [`wallLikes/${code}/${id}`]: null, [`wallComments/${code}/${id}`]: null });
    }
    if (t.closest('[data-aprobar]')) return aprobar(E, code, [{ id, uid }]);
    if (t.closest('[data-aprobar-todas]')) return aprobar(E, code, colaPlana(E).filter(p => !p.hidden).map(p => ({ id: p.id, uid: p.uid })));
    if (t.closest('[data-rechazar]')) {
      if (!confirm('¿Borrar esta aportación? El alumno ya no la verá.')) return;
      return remove(ref(db, `wallQueue/${code}/${uid}/${id}`));
    }
  } catch (err) { aviso(mensajeError(err)); }
}

async function aprobar(E, code, items) {
  const u = {};
  for (const { id, uid } of items) {
    const p = { ...(E.cola[uid] || {})[id] };
    if (!p.uid) continue;
    delete p.hidden;
    u[`wallPosts/${code}/${id}`] = p;
    u[`wallQueue/${code}/${uid}/${id}`] = null;
  }
  await update(ref(db), u);
  aviso(items.length > 1 ? `${items.length} aportaciones publicadas.` : 'Publicada.');
}

async function comentar(e, E, code) {
  const f = e.target.closest('[data-com-form]');
  if (!f) return;
  e.preventDefault();
  const id = f.closest('.post').dataset.id;
  const text = f.elements.t.value.trim();
  if (!text) return;
  try {
    await set(push(ref(db, `wallComments/${code}/${id}`)), { uid: U.uid, name: (U.displayName || 'Profesora').slice(0, 60), text: text.slice(0, 500), at: serverTimestamp() });
    delete E.borradores[id];
  } catch (err) { aviso(mensajeError(err)); }
}

function publicarDocente(E, code, col) {
  dlg.className = 'dlg-post';
  dlg.innerHTML = `<div class="dlg__cab"><h2>Publicar en el muro</h2><button class="dlg__cerrar" type="button" aria-label="Cerrar">×</button></div>
    ${pintarFormulario(E.w, {}, col)}
    <div class="dlg__pie"><button class="mcr-btn" type="button" data-cancelar>Cancelar</button><button class="mcr-btn mcr-btn--prim" type="button" data-publicar>Publicar</button></div>`;
  const form = dlg.querySelector('form');
  activarFormulario(form);
  dlg.querySelector('.dlg__cerrar').onclick = () => dlg.close();
  dlg.querySelector('[data-cancelar]').onclick = () => dlg.close();
  dlg.querySelector('[data-publicar]').onclick = async () => {
    const r = leerFormulario(form, E.w);
    if (r.error) { form.querySelector('.aviso').textContent = r.error; return; }
    const datos = { uid: U.uid, name: (U.displayName || 'Profesora').slice(0, 60), email: String(U.email || '').toLowerCase(), v: r.v, at: serverTimestamp(), docente: true };
    if (r.col) datos.col = r.col;
    try { await set(ref(db, `wallPosts/${code}/${nuevoId()}`), datos); dlg.close(); }
    catch (e) { form.querySelector('.aviso').textContent = mensajeError(e); }
  };
  dlg.showModal();
}

function compartir(code, w) {
  dlg.className = 'dlg-compartir';
  const enlace = enlaceAlumno(code);
  dlg.innerHTML = `<div class="dlg__cab"><h2>Compartir el muro</h2><button class="dlg__cerrar" type="button" aria-label="Cerrar">×</button></div>
    <div class="compartir"><div id="qr-grande" class="qr-grande"></div>
    <div><p class="campo__nombre">Código</p><p class="codigo-grande">${code}</p>
    <p class="campo__nombre">Enlace directo</p><p class="enlace-txt">${esc(enlace)}</p>
    <div class="fila"><button class="mcr-btn mcr-btn--peq mcr-btn--prim" data-copiar type="button">Copiar enlace</button><a class="mcr-btn mcr-btn--peq" href="#/p/${code}">Proyectar</a></div>
    <p class="campo__ayuda">En Classroom, pega el enlace como material. Entran con la cuenta del colegio${w.guests ? ' o, sin cuenta, escribiendo su nombre' : ''}.</p></div></div>`;
  if (window.QRCode) new window.QRCode(dlg.querySelector('#qr-grande'), { text: enlace, width: 220, height: 220, colorDark: '#1E293B', colorLight: '#ffffff' });
  dlg.querySelector('.dlg__cerrar').onclick = () => dlg.close();
  dlg.querySelector('[data-copiar]').onclick = e => navigator.clipboard?.writeText(enlace).then(() => { e.target.textContent = 'Copiado'; });
  dlg.showModal();
}

// ── Exportar ────────────────────────────────────────────────────
function imprimir(E, code) {
  const w = E.w;
  const posts = ordenar(Object.entries(E.posts).map(([id, p]) => ({ ...p, id })), w);
  let caja = document.getElementById('impresion');
  if (!caja) { caja = document.createElement('div'); caja.id = 'impresion'; document.body.appendChild(caja); }
  const tarjeta = p => pintarPost(p, { w: { ...w, comentarios: false, meGusta: false }, docente: true, fechaCompleta: true });
  const coms = p => Object.values(E.coms[p.id] || {}).sort((a, b) => (a.at || 0) - (b.at || 0));
  caja.className = `impresion curso-${w.curso || 'general'}`;
  caja.innerHTML = `<header class="imp-cab"><img src="logo.svg" alt="mariancr"><div><span class="chip-clase">${esc(nombreClase(w.curso, w.grupo))}</span><h1>${rico(w.titulo || 'Muro')}</h1>
    <p>${esc(new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }))} · ${posts.length} aportaciones · código ${code}</p></div></header>
    ${w.descripcion ? `<div class="imp-desc">${rico(w.descripcion)}</div>` : ''}
    ${w.formato === 'columnas' ? listaColumnas(w).map(c => { const ps = posts.filter(p => p.col === c.id); return ps.length ? `<h2 class="mcr-seccion">${rico(c.nombre)}</h2><div class="imp-rejilla">${ps.map(p => tarjeta(p) + pintarComsImp(coms(p))).join('')}</div>` : ''; }).join('')
      + (() => { const ps = posts.filter(p => !listaColumnas(w).some(c => c.id === p.col)); return ps.length ? `<h2 class="mcr-seccion">Sin columna</h2><div class="imp-rejilla">${ps.map(p => tarjeta(p) + pintarComsImp(coms(p))).join('')}</div>` : ''; })()
      : `<div class="imp-rejilla">${posts.map(p => `<div class="imp-item">${tarjeta(p)}${pintarComsImp(coms(p))}</div>`).join('')}</div>`}
    <footer class="mcr-pie-app">mariancr · ${esc(NOMBRE_APP)}</footer>`;
  const titulo = document.title;
  document.title = `${(w.titulo || 'Muro').replace(/[\\/:*?"<>|$]/g, '')} - ${nombreClase(w.curso, w.grupo)}`;
  document.body.classList.add('imprimiendo');
  const fin = () => { document.body.classList.remove('imprimiendo'); document.title = titulo; window.removeEventListener('afterprint', fin); };
  window.addEventListener('afterprint', fin);
  // Espera a que carguen las imágenes
  const imgs = [...caja.querySelectorAll('img')].filter(i => !i.complete);
  Promise.all(imgs.map(i => new Promise(r => { i.onload = i.onerror = r; }))).then(() => setTimeout(() => window.print(), 50));
}
const pintarComsImp = cs => cs.length ? `<div class="imp-coms">${cs.map(c => `<p><b>${esc(c.name)}:</b> ${rico(c.text)}</p>`).join('')}</div>` : '';

function descargarCSV(E, code) {
  const w = E.w;
  const campos = listaCampos(w);
  const cols = listaColumnas(w);
  const filas = [];
  const cab = ['Estado', 'Nombre', 'Correo', 'Fecha', ...(w.formato === 'columnas' ? ['Columna'] : []), ...campos.map(c => c.nombre), 'Me gusta', 'Comentarios'];
  const fila = (p, estado) => [estado, p.name || '', p.email || '', fecha(p.at), ...(w.formato === 'columnas' ? [cols.find(c => c.id === p.col)?.nombre || ''] : []),
    ...campos.map(c => { const v = (p.v || {})[c.id] || ''; return c.tipo === 'imagen' ? (v ? '(imagen)' : '') : v; }),
    Object.keys(E.likes[p.id] || {}).length, Object.values(E.coms[p.id] || {}).map(c => `${c.name}: ${c.text}`).join(' | ')];
  ordenar(Object.entries(E.posts).map(([id, p]) => ({ ...p, id })), { orden: 'antiguos' }).forEach(p => filas.push(fila(p, p.pinned ? 'Publicada (fijada)' : 'Publicada')));
  colaPlana(E).forEach(p => filas.push(fila(p, p.hidden ? 'Oculta' : 'Pendiente')));
  const csv = '﻿' + [cab, ...filas].map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `Muro ${code} - ${(w.titulo || '').replace(/[\\/:*?"<>|$]/g, '').slice(0, 60)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

// ── Rutas ───────────────────────────────────────────────────────
function ruta() {
  if (!U) return;
  const h = location.hash.replace(/^#/, '') || '/';
  const [camino, qs] = h.split('?');
  const p = camino.split('/').filter(Boolean);
  if (p[0] === 'nuevo') return pantallaEditor(null, new URLSearchParams(qs || '').get('clase'));
  if (p[0] === 'editar' && p[1]) return pantallaEditor(p[1]);
  if (p[0] === 'm' && p[1]) return pantallaMuro(p[1], false);
  if (p[0] === 'p' && p[1]) return pantallaMuro(p[1], true);
  pantallaInicio();
}
window.addEventListener('hashchange', ruta);

onAuthStateChanged(auth, async u => {
  U = u;
  if (!u) return pantallaLogin();
  let docente = false;
  try { docente = (await get(ref(db, `teachers/${u.uid}`))).val() === true; } catch { }
  if (!docente) return pantallaSinPermiso(u);
  ruta();
});
