import './Layer.css';

export {
  focusables,
  isComposing,
  isModalLayerOpen,
  layerCount,
  useBodyScrollLock,
  useModalLayer,
  usePopupLayer,
} from './stack.js';
export type {
  DismissReason,
  LayerKind,
  ModalLayer,
  ModalLayerOptions,
  PopupLayer,
  PopupLayerOptions,
} from './stack.js';

export { LAYER_GAP, LAYER_REPOSITION_EVENT, outsideBounds, placePopup, viewportBounds } from './place.js';
export type { Placement, PlacementRect, PlacementSize } from './place.js';

export { LayerHost, useLayerContainer } from './LayerHost.js';
export type { LayerHostProps } from './LayerHost.js';
