import type { Page } from '@playwright/test';

/** Fills the empty app with the demo program (10 exercises, 3 days) via the component gallery. */
export async function loadDemo(page: Page) {
  await page.goto('./#/kit');
  await page.getByRole('button', { name: 'Загрузить демо-данные' }).click();
  await page.getByRole('button', { name: 'Понятно' }).click();
}

/** Opens the editor of demo Day 1 («Верх тела»: Жим лёжа, Подтягивания, …). */
export async function openDemoDay1(page: Page) {
  await page.goto('./#/days');
  await page.getByRole('link', { name: /день 1/i }).first().click();
}
