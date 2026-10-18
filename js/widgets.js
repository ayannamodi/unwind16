// Registry of all fidgets. Each module exports mountX(container, api) -> destroy().
import { mountBottle } from './fidgets/bottle.js';
import { mountRug } from './fidgets/rug.js';
import { mountSlime } from './fidgets/slime.js';
import { mountPolaroid } from './fidgets/polaroid.js';
import { mountDrinkBar } from './fidgets/drinkbar.js';
import { mountSpinner } from './fidgets/spinner.js';
import { mountSquishy } from './fidgets/squishy.js';
import { mountPhoneCase } from './fidgets/phonecase.js';

export const WIDGETS = {
  polaroid: mountPolaroid,
  bottle: mountBottle,
  spinner: mountSpinner,
  rug: mountRug,
  squishy: mountSquishy,
  slime: mountSlime,
  phonecase: mountPhoneCase,
  frappe: mountDrinkBar,
};
