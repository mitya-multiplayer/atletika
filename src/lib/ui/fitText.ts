/**
 * Svelte action: fits display text to the available width. The font shrinks
 * until the longest word fits, so long Russian words never overflow narrow
 * phones (docs/TYPOGRAPHY.md, section 5.7). With `max`, it first grows to
 * `max` so short poster titles fill the width as in the references.
 *
 * The element needs a definite width: inside flex or grid, give it min-width: 0.
 * With `maxLines`, it also shrinks until the text wraps to at most that many lines.
 * `onfit` receives the fitted size in px, so other text can follow it.
 */
type FitOptions = { min?: number; max?: number; maxLines?: number; onfit?: (px: number) => void };

export function fitText(node: HTMLElement, options: FitOptions = {}) {
  let { min = 20, max, maxLines, onfit } = options;

  function tooBig() {
    if (node.scrollWidth > node.clientWidth + 1) return true;
    if (!maxLines) return false;
    const cs = getComputedStyle(node);
    const lineHeight = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2; // 'normal'
    return node.getBoundingClientRect().height > maxLines * lineHeight + 1;
  }

  function fit() {
    node.style.fontSize = max ? `${max}px` : '';
    let size = parseFloat(getComputedStyle(node).fontSize);
    while (tooBig() && size > min) {
      size -= 2;
      node.style.fontSize = `${size}px`;
    }
    onfit?.(size);
  }

  // Observe the parent: the node's own height changes while fitting.
  const observer = new ResizeObserver(fit);
  if (node.parentElement) observer.observe(node.parentElement);
  // Refit when the text changes: the same element can show another title (the next exercise
  // in a workout, or a name that loads after the screen). Fitting only touches `style`, which
  // these options do not watch, so it cannot trigger itself.
  const textObserver = new MutationObserver(fit);
  textObserver.observe(node, { childList: true, characterData: true, subtree: true });
  document.fonts?.ready.then(fit);
  fit();

  return {
    update(next: FitOptions = {}) {
      ({ min = 20, max, maxLines, onfit } = next);
      fit();
    },
    destroy() {
      observer.disconnect();
      textObserver.disconnect();
    },
  };
}
