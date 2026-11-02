/* Muro · funciones comunes a la vista del alumnado y a la de la docente */

export const CURSOS = [
  { id: '1eso', nombre: '1.º ESO', materia: 'BioGeo', grupos: [''] },
  { id: '2eso', nombre: '2.º ESO', materia: 'FyQ', grupos: ['A', 'B'] },
  { id: '4eso', nombre: '4.º ESO', materia: 'FyQ', grupos: ['A', 'B'] },
  { id: '1bach', nombre: '1.º Bach', materia: 'FyQ', grupos: [''] },
  { id: '2bach', nombre: '2.º Bach', materia: 'Química', grupos: [''] }
];
export const CLASES = CURSOS.flatMap(c => c.grupos.map(g => ({ id: g ? `${c.id}-${g.toLowerCase()}` : c.id, curso: c.id, grupo: g, nombre: c.nombre + (g ? ' ' + g : ''), materia: c.materia })));
export const cursoDe = id => CURSOS.find(c => c.id === id) || null;
export const nombreClase = (curso, grupo = '') => { const c = cursoDe(curso); return c ? c.nombre + (grupo ? ' ' + grupo : '') : 'Sin curso'; };
export const claseDe = w => w && w.curso ? (w.grupo ? `${w.curso}-${String(w.grupo).toLowerCase()}` : w.curso) : 'sin';

export function colorCurso(curso) {
  const b = document.body;
  [...b.classList].filter(c => c.startsWith('curso-')).forEach(c => b.classList.remove(c));
  b.classList.add('curso-' + (curso && cursoDe(curso) ? curso : 'general'));
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Fórmulas: $…$, $$…$$ y \ce{…} con KaTeX + mhchem
const trozosMath = s => {
  const out = [];
  const re = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$|(\\ce\{(?:[^{}]|\{[^{}]*\})*\})/g;
  let i = 0, m;
  while ((m = re.exec(s))) {
    if (m.index > i) out.push({ t: s.slice(i, m.index) });
    out.push({ m: m[1] ?? m[2] ?? m[3], bloque: m[1] != null });
    i = re.lastIndex;
  }
  if (i < s.length) out.push({ t: s.slice(i) });
  return out;
};
export function rico(s) {
  const k = globalThis.katex;
  return trozosMath(String(s ?? '')).map(p => {
    if (p.t != null) return esc(p.t).replace(/\n/g, '<br>');
    if (!k) return esc(p.bloque ? `$$${p.m}$$` : `$${p.m}$`);
    try { return k.renderToString(p.m, { displayMode: p.bloque, throwOnError: false, strict: false, output: 'html' }); }
    catch { return esc(p.m); }
  }).join('');
}
export const tieneFormula = s => /\$[^$]+\$|\\ce\{/.test(String(s || ''));

export function nuevoCodigo() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const r = crypto.getRandomValues(new Uint32Array(6));
  return Array.from(r, x => A[x % A.length]).join('');
}
export const nuevoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export async function reducirImagen(file, max = 1280, calidad = 0.8) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = url; });
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    // Volver a dibujar en un lienzo elimina los datos de ubicación y de la cámara (EXIF)
    let q = calidad, d = c.toDataURL('image/jpeg', q);
    while (d.length > 450000 && q > 0.4) { q -= 0.1; d = c.toDataURL('image/jpeg', q); }
    return d;
  } finally { URL.revokeObjectURL(url); }
}

export function haceRato(t) {
  if (!t) return '';
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return 'ahora';
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  return new Date(t).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}
export const fecha = t => t ? new Date(t).toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

// ── Campos que rellena el alumnado ──────────────────────────────
export const TIPOS_CAMPO = {
  titulo: 'Título',
  corto: 'Texto corto',
  largo: 'Texto largo',
  numero: 'Número',
  opciones: 'Elegir de una lista',
  enlace: 'Enlace',
  imagen: 'Imagen o foto'
};
export const camposPorDefecto = () => ([
  { id: 'titulo', tipo: 'titulo', nombre: 'Título', obligatorio: false },
  { id: 'texto', tipo: 'largo', nombre: 'Texto', obligatorio: false, sinEtiqueta: true },
  { id: 'imagen', tipo: 'imagen', nombre: 'Imagen', obligatorio: false },
  { id: 'enlace', tipo: 'enlace', nombre: 'Enlace', obligatorio: false }
]);
export const listaCampos = w => (Array.isArray(w?.campos) ? w.campos : Object.values(w?.campos || {})).filter(Boolean);
export const listaColumnas = w => (Array.isArray(w?.columnas) ? w.columnas : Object.values(w?.columnas || {})).filter(Boolean);
export const opcionesDe = c => String(c.opciones || '').split('\n').map(s => s.trim()).filter(Boolean);

export const FORMATOS = {
  muro: { nombre: 'Muro', desc: 'Tarjetas en mosaico, como un tablón.' },
  columnas: { nombre: 'Columnas', desc: 'Una columna por apartado; cada alumno elige dónde publica.' },
  lista: { nombre: 'Lista', desc: 'Una debajo de otra, como un hilo.' }
};

export const ajustesPorDefecto = () => ({
  titulo: '', descripcion: '', curso: '', grupo: '',
  formato: 'muro', columnas: [], campos: camposPorDefecto(),
  abierto: true, moderacion: false, nombres: true, meGusta: true, comentarios: true,
  editar: true, maxPorAlumno: 0, orden: 'recientes', guests: false
});

// ── Enlaces ─────────────────────────────────────────────────────
export function normalizarEnlace(s) {
  s = String(s || '').trim();
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  try { const u = new URL(s); return /^https?:$/.test(u.protocol) && u.hostname.includes('.') ? u.href : ''; } catch { return ''; }
}
function idYoutube(u) {
  try {
    const x = new URL(u);
    if (/youtu\.be$/.test(x.hostname)) return x.pathname.slice(1);
    if (/youtube\.com$/.test(x.hostname)) return x.searchParams.get('v') || (x.pathname.match(/\/(shorts|embed)\/([\w-]+)/) || [])[2] || '';
  } catch { }
  return '';
}
export function pintarEnlace(u) {
  const href = normalizarEnlace(u);
  if (!href) return '';
  const yt = idYoutube(href);
  const host = new URL(href).hostname.replace(/^www\./, '');
  return `<a class="post-enlace" href="${esc(href)}" target="_blank" rel="noopener noreferrer">
    ${yt ? `<img src="https://i.ytimg.com/vi/${esc(yt)}/mqdefault.jpg" alt="" loading="lazy">` : ''}
    <span class="post-enlace__host">${ICO.enlace}${esc(host)}</span></a>`;
}

export const ICO = {
  enlace: '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  corazon: '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill="currentColor"/></svg>',
  corazonVacio: '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  comentario: '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  chincheta: '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M9 3h6l-1 6 4 4H6l4-4zM12 13v8" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>',
  mas: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  menu: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="5" cy="12" r="1.8" fill="currentColor"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/><circle cx="19" cy="12" r="1.8" fill="currentColor"/></svg>'
};

// ── Tarjeta de una aportación ───────────────────────────────────
// opts: { w, likes, comentarios, uid, docente, pendiente, oculta, acciones (html) }
export function pintarPost(p, opts) {
  const { w } = opts;
  const v = p.v || {};
  const partes = [];
  for (const c of listaCampos(w)) {
    const val = v[c.id];
    if (val == null || val === '') continue;
    if (c.tipo === 'titulo') partes.push(`<h3 class="post__titulo">${rico(val)}</h3>`);
    else if (c.tipo === 'imagen') partes.push(String(val).startsWith('data:image/') ? `<button class="post__img" data-ver-img type="button" aria-label="Ampliar imagen"><img src="${esc(val)}" alt="${esc(c.nombre)}" loading="lazy"></button>` : '');
    else if (c.tipo === 'enlace') partes.push(pintarEnlace(val));
    else partes.push(`<div class="post__campo">${c.sinEtiqueta ? '' : `<span class="post__etiqueta">${esc(c.nombre)}</span>`}<div class="post__texto">${rico(val)}</div></div>`);
  }
  // Valores de campos que la docente ha borrado después: no se pierden
  const ids = new Set(listaCampos(w).map(c => c.id));
  for (const [k, val] of Object.entries(v)) if (!ids.has(k) && val && !String(val).startsWith('data:')) partes.push(`<div class="post__campo"><div class="post__texto">${rico(val)}</div></div>`);

  const likes = opts.likes || {};
  const nLikes = Object.keys(likes).length;
  const yoLike = opts.uid && likes[opts.uid];
  const coms = Object.entries(opts.comentarios || {}).sort((a, b) => (a[1].at || 0) - (b[1].at || 0));
  const mio = opts.uid && p.uid === opts.uid;
  const verNombre = w.nombres !== false || opts.docente;
  const estado = opts.oculta ? '<span class="post__estado post__estado--oculta">Oculta por la profesora</span>'
    : opts.pendiente ? '<span class="post__estado">Pendiente de revisar</span>' : '';
  const interaccion = !opts.pendiente && !opts.oculta;
  return `<article class="post${p.pinned ? ' post--fijada' : ''}${mio ? ' post--mia' : ''}${opts.pendiente || opts.oculta ? ' post--pendiente' : ''}" data-id="${esc(p.id)}" data-uid="${esc(p.uid)}">
    ${p.pinned ? `<span class="post__fijada">${ICO.chincheta} Fijada</span>` : ''}
    ${estado}
    <div class="post__cuerpo">${partes.join('') || '<p class="post__vacio">(sin contenido)</p>'}</div>
    <footer class="post__pie">
      <span class="post__autor">${verNombre ? esc(p.name || '') : (mio ? 'Tú' : '')}${verNombre && mio ? ' <span class="post__tu">(tú)</span>' : ''}${p.docente ? ' <span class="post__profe">Profesora</span>' : ''}</span>
      <span class="post__hora" title="${esc(fecha(p.at))}">${esc(opts.fechaCompleta ? fecha(p.at) : haceRato(p.at))}${p.edited ? ' · editada' : ''}</span>
      ${interaccion && w.meGusta !== false ? `<button class="post__accion${yoLike ? ' on' : ''}" data-like type="button" aria-pressed="${yoLike ? 'true' : 'false'}" aria-label="Me gusta">${yoLike ? ICO.corazon : ICO.corazonVacio}<span>${nLikes || ''}</span></button>` : ''}
      ${interaccion && w.comentarios !== false ? `<button class="post__accion" data-coms type="button" aria-label="Comentarios">${ICO.comentario}<span>${coms.length || ''}</span></button>` : ''}
      ${opts.acciones ? `<span class="post__menu">${opts.acciones}</span>` : ''}
    </footer>
    ${interaccion && w.comentarios !== false ? `<div class="post__coms" hidden>
      ${coms.map(([cid, c]) => `<p class="com" data-cid="${esc(cid)}"><b>${esc(w.nombres !== false || opts.docente || c.uid === opts.uid ? c.name : 'Compañero/a')}</b> ${rico(c.text)}${(c.uid === opts.uid || opts.docente) ? ` <button class="com__borrar" data-borrar-com="${esc(cid)}" type="button" aria-label="Borrar comentario">×</button>` : ''}</p>`).join('')}
      ${opts.puedeComentar ? `<form class="com-form" data-com-form><input name="t" maxlength="500" placeholder="Escribe un comentario…" aria-label="Comentario" required><button class="mcr-btn mcr-btn--peq" type="submit">Enviar</button></form>` : ''}
    </div>` : ''}
  </article>`;
}

// Ordena: fijadas primero; luego por fecha según el ajuste del muro
export function ordenar(posts, w) {
  const asc = w.orden === 'antiguos';
  return posts.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (asc ? (a.at || 0) - (b.at || 0) : (b.at || 0) - (a.at || 0)));
}

// Distribuye las tarjetas por formato
export function pintarTablero(posts, w, pintar, { botonColumna } = {}) {
  const lista = ordenar(posts.slice(), w);
  if (w.formato === 'columnas') {
    const cols = listaColumnas(w);
    const sinCol = lista.filter(p => !cols.some(c => c.id === p.col));
    const bloques = cols.map(c => ({ c, ps: lista.filter(p => p.col === c.id) }));
    if (sinCol.length || !cols.length) bloques.push({ c: { id: '', nombre: cols.length ? 'Sin columna' : 'Aportaciones' }, ps: sinCol });
    return `<div class="tablero tablero--columnas">${bloques.map(({ c, ps }) => `<section class="columna" data-col="${esc(c.id)}">
      <h2 class="columna__titulo"><span>${rico(c.nombre)}</span><span class="columna__n">${ps.length}</span></h2>
      ${botonColumna && c.id !== '' || botonColumna && !cols.length ? `<button class="columna__nueva" type="button" data-nueva="${esc(c.id)}">${ICO.mas} Añadir</button>` : ''}
      ${ps.map(pintar).join('')}</section>`).join('')}</div>`;
  }
  return `<div class="tablero tablero--${w.formato === 'lista' ? 'lista' : 'muro'}">${lista.map(pintar).join('')}</div>`;
}

// ── Formulario de aportación ────────────────────────────────────
export function pintarFormulario(w, previo = {}, col = '') {
  const v = previo.v || {};
  const cols = listaColumnas(w);
  const campos = listaCampos(w);
  return `<form class="form-post" novalidate>
    ${w.formato === 'columnas' && cols.length ? `<label class="campo"><span class="campo__nombre">Columna</span>
      <select name="__col">${cols.map(c => `<option value="${esc(c.id)}"${(previo.col || col) === c.id ? ' selected' : ''}>${esc(c.nombre)}</option>`).join('')}</select></label>` : ''}
    ${campos.map(c => {
      const req = c.obligatorio ? ' <span class="campo__req" title="Obligatorio">*</span>' : '';
      const ayuda = c.ayuda ? `<span class="campo__ayuda">${esc(c.ayuda)}</span>` : '';
      const nom = `<span class="campo__nombre">${esc(c.nombre)}${req}</span>${ayuda}`;
      const val = v[c.id] ?? '';
      switch (c.tipo) {
        case 'titulo': case 'corto':
          return `<label class="campo">${nom}<input name="${esc(c.id)}" maxlength="${c.tipo === 'titulo' ? 120 : 300}" value="${esc(val)}" data-formula></label>`;
        case 'largo':
          return `<label class="campo">${nom}<textarea name="${esc(c.id)}" rows="4" maxlength="3000" data-formula>${esc(val)}</textarea></label>`;
        case 'numero':
          return `<label class="campo">${nom}<input name="${esc(c.id)}" inputmode="decimal" maxlength="40" value="${esc(val)}" data-formula></label>`;
        case 'opciones':
          return `<label class="campo">${nom}<select name="${esc(c.id)}"><option value="">Elige…</option>${opcionesDe(c).map(o => `<option${o === val ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select></label>`;
        case 'enlace':
          return `<label class="campo">${nom}<input name="${esc(c.id)}" type="url" inputmode="url" maxlength="800" placeholder="https://…" value="${esc(val)}"></label>`;
        case 'imagen':
          return `<div class="campo campo--imagen" data-campo-img="${esc(c.id)}">${nom}
            <input type="hidden" name="${esc(c.id)}" value="${esc(val)}">
            <div class="campo__img-vista">${val ? `<img src="${esc(val)}" alt="">` : ''}</div>
            <div class="campo__img-botones"><label class="mcr-btn mcr-btn--peq">Elegir o hacer foto<input type="file" accept="image/*" hidden></label>
            <button class="mcr-btn mcr-btn--peq" type="button" data-quitar-img${val ? '' : ' hidden'}>Quitar</button></div></div>`;
        default: return '';
      }
    }).join('')}
    <div class="form-post__vista" hidden><span class="campo__nombre">Así se verán las fórmulas</span><div></div></div>
    <p class="form-post__ayuda">Fórmulas entre dólares: <code>$x^2$</code>, <code>$\\ce{H2O}$</code>.</p>
    <p class="aviso" role="alert"></p>
  </form>`;
}

// Activa imágenes y vista previa de fórmulas en un formulario ya pintado
export function activarFormulario(form) {
  form.querySelectorAll('[data-campo-img]').forEach(box => {
    const oculto = box.querySelector('input[type=hidden]');
    const vista = box.querySelector('.campo__img-vista');
    const quitar = box.querySelector('[data-quitar-img]');
    box.querySelector('input[type=file]').onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      vista.innerHTML = '<p class="campo__ayuda">Preparando la imagen…</p>';
      try { oculto.value = await reducirImagen(f); vista.innerHTML = `<img src="${oculto.value}" alt="">`; quitar.hidden = false; }
      catch { vista.innerHTML = '<p class="aviso">No se ha podido leer esa imagen.</p>'; }
      e.target.value = '';
    };
    quitar.onclick = () => { oculto.value = ''; vista.innerHTML = ''; quitar.hidden = true; };
  });
  const vista = form.querySelector('.form-post__vista');
  const pintar = () => {
    const txt = [...form.querySelectorAll('[data-formula]')].map(i => i.value).filter(tieneFormula);
    vista.hidden = !txt.length;
    vista.querySelector('div').innerHTML = txt.map(t => `<p>${rico(t)}</p>`).join('');
  };
  form.addEventListener('input', pintar);
  pintar();
}

// Lee y valida el formulario. Devuelve { v, col } o { error }
export function leerFormulario(form, w) {
  const v = {};
  for (const c of listaCampos(w)) {
    const el = form.elements[c.id];
    let val = el ? String(el.value || '').trim() : '';
    if (c.tipo === 'enlace' && val) { const n = normalizarEnlace(val); if (!n) return { error: `«${c.nombre}» no es un enlace válido.` }; val = n; }
    if (c.obligatorio && !val) return { error: `Falta rellenar «${c.nombre}».` };
    if (val) v[c.id] = val;
  }
  if (!Object.keys(v).length) return { error: 'Escribe algo antes de publicar.' };
  const col = form.elements.__col ? form.elements.__col.value : '';
  return { v, col };
}

// Visor de imagen ampliada
export function verImagen(src) {
  const d = document.createElement('dialog');
  d.className = 'visor-img';
  d.innerHTML = `<img src="${esc(src)}" alt=""><button class="mcr-btn" type="button">Cerrar</button>`;
  document.body.appendChild(d);
  d.querySelector('button').onclick = () => d.close();
  d.addEventListener('click', e => { if (e.target === d) d.close(); });
  d.addEventListener('close', () => d.remove());
  d.showModal();
}
