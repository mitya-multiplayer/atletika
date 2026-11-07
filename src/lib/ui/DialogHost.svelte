<script lang="ts">
  import Button from './Button.svelte';
  import { dialog } from './dialog.svelte';

  let element: HTMLDialogElement | undefined = $state();

  $effect(() => {
    if (!element) return;
    if (dialog.current && !element.open) element.showModal();
    if (!dialog.current && element.open) element.close();
  });

  function finish(confirmed: boolean) {
    const request = dialog.current;
    dialog.current = null;
    request?.resolve(confirmed);
  }
</script>

<dialog
  bind:this={element}
  aria-labelledby="dialog-title"
  oncancel={(event) => {
    event.preventDefault();
    finish(false);
  }}
>
  {#if dialog.current}
    {@const request = dialog.current}
    <h2 id="dialog-title" class="display">{request.title}</h2>
    {#if request.message}<p>{request.message}</p>{/if}
    <div class="buttons">
      <Button onclick={() => finish(true)}>{request.confirmLabel}</Button>
      {#if request.cancelLabel}
        <Button variant="secondary" onclick={() => finish(false)}>{request.cancelLabel}</Button>
      {/if}
    </div>
  {/if}
</dialog>

<style>
  dialog {
    width: min(100% - 2 * var(--gutter), 440px);
    padding: 24px var(--gutter) var(--gutter);
    border: 2px solid var(--c-cream);
    border-radius: var(--radius-m);
    background: var(--c-bg);
    color: var(--c-cream);
  }

  dialog::backdrop {
    background: rgb(7 7 6 / 0.8);
  }

  h2 {
    font-size: 30px;
    line-height: 1;
  }

  p {
    margin-top: 12px;
    color: var(--c-text-muted);
    white-space: pre-line;
  }

  .buttons {
    display: grid;
    gap: 10px;
    margin-top: 24px;
  }
</style>
