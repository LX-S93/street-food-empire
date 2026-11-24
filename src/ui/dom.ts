// DOM updates. The game re-renders its views several times per second; instead of
// replacing innerHTML (which re-creates every image and makes Safari flicker), the
// live tree is patched towards the new markup.

type Rendered = HTMLElement & { __h?: string };

function morphAttrs(a: Element, b: Element): void {
  for (const at of Array.from(a.attributes)) if (!b.hasAttribute(at.name)) a.removeAttribute(at.name);
  for (const at of Array.from(b.attributes)) if (a.getAttribute(at.name) !== at.value) a.setAttribute(at.name, at.value);
  const active = a === document.activeElement;
  if (a instanceof HTMLInputElement && !active) {
    const v = b.getAttribute('value');
    if (v != null && a.value !== v) a.value = v;
    a.checked = b.hasAttribute('checked');
  } else if (a instanceof HTMLTextAreaElement && !active) {
    if (a.value !== b.textContent) a.value = b.textContent ?? '';
  }
}

function morph(a: Node, b: Node): void {
  const next = Array.from(b.childNodes);
  for (let i = 0; i < next.length; i++) {
    const nb = next[i];
    const na = a.childNodes[i];
    if (!na) { a.appendChild(nb.cloneNode(true)); continue; }
    const differentImage = na instanceof HTMLImageElement && nb instanceof Element && na.getAttribute('src') !== nb.getAttribute('src');
    if (na.nodeType !== nb.nodeType || na.nodeName !== nb.nodeName || differentImage) {
      a.replaceChild(nb.cloneNode(true), na);
      continue;
    }
    if (!(na instanceof Element) || !(nb instanceof Element)) {
      if (na.nodeValue !== nb.nodeValue) na.nodeValue = nb.nodeValue;
      continue;
    }
    morphAttrs(na, nb);
    morph(na, nb);
    if (na instanceof HTMLSelectElement && na !== document.activeElement) {
      const o = nb.querySelector('option[selected]');
      const v = o ? (o.getAttribute('value') ?? o.textContent) : null;
      if (v != null && na.value !== v) na.value = v;
    }
  }
  while (a.childNodes.length > next.length) a.removeChild(a.lastChild as ChildNode);
}

export function setHTML(el: Rendered, html: string): void {
  if (el.__h === html) return;
  const focused = document.activeElement && document.activeElement.id;
  if (el.__h == null || html === '') {
    el.innerHTML = html;
  } else {
    const t = document.createElement('template');
    t.innerHTML = html;
    morph(el, t.content);
  }
  el.__h = html;
  if (focused) {
    const n = document.getElementById(focused);
    if (n && n !== document.activeElement) {
      try { n.focus({ preventScroll: true }); } catch { /* ignore */ }
    }
  }
}
