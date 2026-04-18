import type { ButtonHandler, ModalHandler, SelectMenuHandler } from '@atlas/types';
import {
  creatorApplyCancelButtonHandler,
  creatorApplyConfirmButtonHandler,
} from './apply-buttons.js';

export const creatorButtonHandlers: ButtonHandler[] = [
  creatorApplyConfirmButtonHandler,
  creatorApplyCancelButtonHandler,
];
export const creatorSelectMenuHandlers: SelectMenuHandler[] = [];
export const creatorModalHandlers: ModalHandler[] = [];
