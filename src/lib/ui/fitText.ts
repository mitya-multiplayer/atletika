/**
 * Svelte action: fits display text to the available width. The font shrinks
 * until the longest word fits, so long Russian words never overflow narrow
 * phones (docs/TYPOGRAPHY.md, section 5.7). With `max`, it first grows to
 * `max` so short poster titles fill the width as in the references.
 *
 * The element needs a definite width: inside flex or grid, give it min-width: 0.
 */
type FitOptions = { min?: number; max?: number };

export function fitText(node: HTMLElement, options: FitOptions = {}) {
  let { min = 20, max } = options;

  function fit() {
    node.style.fontSize = max ? `${max}px` : '';
    let size = parseFloat(getComputedStyle(node).fontSize);
    while (node.scrollWidth > node.clientWidth + 1 && size > min) {
      size -= 2;
      node.style.fontSize = `${size}px`;
    }
  }

  // Observe the parent: the node's own height changes while fitting.
  const observer = new ResizeObserver(fit);
  if (node.parentElement) observer.observe(node.parentElement);
  document.fonts?.ready.then(fit);
  fit();

  return {
    update(next: FitOptions = {}) {
      ({ min = 20, max } = next);
      fit();
    },
    destroy() {
      observer.disconnect();
    },
  };
}
