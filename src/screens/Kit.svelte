<!-- Component gallery: every reusable piece in its states, for design review. -->
<script lang="ts">
  import { loadDemoData } from '../lib/db/demo';
  import AccentStripe from '../lib/ui/AccentStripe.svelte';
  import BackButton from '../lib/ui/BackButton.svelte';
  import Button from '../lib/ui/Button.svelte';
  import DayLabel from '../lib/ui/DayLabel.svelte';
  import { confirmAction, showMessage } from '../lib/ui/dialog.svelte';
  import Icon, { ICON_NAMES } from '../lib/ui/Icon.svelte';
  import IconButton from '../lib/ui/IconButton.svelte';
  import ListRow from '../lib/ui/ListRow.svelte';
  import ProgressScale from '../lib/ui/ProgressScale.svelte';
  import ScreenHeader from '../lib/ui/ScreenHeader.svelte';
  import SetChip from '../lib/ui/SetChip.svelte';
  import Stepper from '../lib/ui/Stepper.svelte';
  import TextField from '../lib/ui/TextField.svelte';
  import { formatRest } from '../lib/domain/format';

  const ALPHABET_UPPER = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ';
  const ALPHABET_LOWER = 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя';
  const SYMBOLS = '0123456789 «» — – … № % × · ? !';

  let reps = $state(10);
  let rest = $state(90);
  let fieldValue = $state('');

  async function demo() {
    const loaded = await loadDemoData();
    await showMessage(
      loaded ? 'Демо-данные загружены' : 'Данные уже есть',
      loaded
        ? 'Добавлены 10 упражнений и 3 тренировочных дня.'
        : 'Демо-данные загружаются только в пустое приложение.',
    );
  }
</script>

<main class="screen">
  <ScreenHeader back={{ to: '/settings', label: 'Настройки' }} title="Компоненты" />

  <section>
    <h2 class="num display">01 Кнопка назад</h2>
    <BackButton to="/" label="Главная" />
  </section>

  <section>
    <h2 class="num display">02 Маленькое название дня</h2>
    <DayLabel number={1} name="Верх тела" />
  </section>

  <section>
    <h2 class="num display">03 Шкала</h2>
    <div class="stack">
      <ProgressScale total={5} current={0} />
      <ProgressScale total={5} current={2} />
      <ProgressScale total={8} current={5} />
    </div>
  </section>

  <section>
    <h2 class="num display">04 Активная кнопка</h2>
    <div class="stack">
      <Button>Завершить подход</Button>
      <Button icon="play" trailing="chevron-right">Начать тренировку</Button>
      <Button disabled>Недоступно</Button>
    </div>
  </section>

  <section>
    <h2 class="num display">05 Кнопка</h2>
    <div class="stack">
      <Button variant="secondary">Пропустить упражнение</Button>
      <Button variant="secondary" icon="plus">Добавить упражнение</Button>
    </div>
  </section>

  <section>
    <h2 class="num display">06 Задний фон 1</h2>
    <div class="stripe-demo"><AccentStripe class="demo-stripe" /></div>
  </section>

  <section>
    <h2 class="num display">Строки списка</h2>
    <div class="stack">
      <ListRow>
        <span class="day display">День 1</span>
        <span>Верх тела</span>
        {#snippet actions()}
          <IconButton icon="edit" label="Изменить" />
          <IconButton icon="delete" label="Удалить" />
        {/snippet}
      </ListRow>
      <ListRow handle actionsLayout="column">
        <span class="ex-name">Отжимания на упорах</span>
        <span>3 × 15</span>
        <span class="chips"><SetChip index={1} reps={15} /><SetChip index={2} reps={15} /><SetChip index={3} reps={15} /></span>
        {#snippet actions()}
          <IconButton icon="edit" label="Настроить" />
          <IconButton icon="delete" label="Убрать" />
        {/snippet}
      </ListRow>
    </div>
  </section>

  <section>
    <h2 class="num display">Подход</h2>
    <div class="set">
      <Stepper label="Повторения" value={reps} min={1} onchange={(v) => (reps = v)} />
      <Stepper label="Отдых" value={rest} step={15} format={formatRest} onchange={(v) => (rest = v)} />
    </div>
  </section>

  <section>
    <h2 class="num display">Поле ввода</h2>
    <div class="stack">
      <TextField label="Название" required bind:value={fieldValue} placeholder="Введите название упражнения…" />
      <TextField label="Ссылка на видео" value="youtube" error="Ссылка должна начинаться с http:// или https://" />
    </div>
  </section>

  <section>
    <h2 class="num display">Диалог</h2>
    <Button
      variant="secondary"
      onclick={() => confirmAction({ title: 'Удалить ДЕНЬ 2?', message: 'Пример подтверждения.', confirmLabel: 'Удалить' })}
    >
      Показать диалог
    </Button>
  </section>

  <section>
    <h2 class="num display">Иконки</h2>
    <div class="icons">
      {#each ICON_NAMES as name (name)}
        <figure><Icon {name} size={30} /><figcaption>{name}</figcaption></figure>
      {/each}
    </div>
  </section>

  <section>
    <h2 class="num display">Шрифты</h2>
    <p class="specimen oswald-700">{ALPHABET_UPPER}</p>
    <p class="specimen oswald-600">{ALPHABET_UPPER} {SYMBOLS}</p>
    <p class="caption">Oswald 700 / 600</p>
    <p class="specimen rc-400">{ALPHABET_UPPER} {ALPHABET_LOWER} {SYMBOLS}</p>
    <p class="specimen rc-500">{ALPHABET_LOWER}</p>
    <p class="specimen rc-700">{ALPHABET_UPPER} {ALPHABET_LOWER}</p>
    <p class="caption">Roboto Condensed 400 / 500 / 700</p>
  </section>

  <section>
    <h2 class="num display">Данные</h2>
    <Button variant="secondary" onclick={demo}>Загрузить демо-данные</Button>
  </section>
</main>

<style>
  section {
    display: grid;
    gap: 12px;
    padding: 18px 0;
    border-top: 1px solid var(--c-panel-line);
  }

  .num {
    font-weight: 600;
    font-size: 20px;
    color: var(--c-text-muted);
  }

  .stripe-demo {
    position: relative;
    height: 120px;
    border: 1px dashed var(--c-panel-line);
  }

  .stripe-demo :global(.demo-stripe) {
    width: 100%;
    height: 100%;
  }

  .day {
    display: block;
    font-size: 30px;
  }

  .ex-name {
    display: block;
    font-weight: 700;
    text-transform: uppercase;
  }

  .chips {
    display: flex;
    gap: 6px;
    margin-top: 8px;
  }

  .set {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    padding: 10px 12px;
    border-radius: var(--radius-m);
    background: var(--c-cream);
    color: var(--c-ink);
  }

  .icons {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(76px, 1fr));
    gap: 8px;
  }

  figure {
    display: grid;
    justify-items: center;
    gap: 6px;
    margin: 0;
    padding: 10px 4px;
    border-radius: var(--radius-s);
    background: var(--c-cream);
    color: var(--c-ink);
  }

  figcaption {
    font-size: 11px;
  }

  .specimen {
    overflow-wrap: anywhere;
  }

  .oswald-700 {
    font: 700 34px/1.05 var(--font-display);
  }

  .oswald-600 {
    font: 600 22px/1.2 var(--font-display);
  }

  .rc-400 {
    font: 400 17px/1.4 var(--font-ui);
  }

  .rc-500 {
    font: 500 17px/1.4 var(--font-ui);
  }

  .rc-700 {
    font: 700 17px/1.4 var(--font-ui);
  }

  .caption {
    font-size: var(--fs-small);
    color: var(--c-text-muted);
  }
</style>
