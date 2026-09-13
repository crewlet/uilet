import { addons } from 'storybook/manager-api';
import { defaultCrewletDark } from './themes';

// Set defaultCrewletDark as the active chrome theme. To swap to light mode,
// import defaultCrewletLight from './themes' and pass that instead.
addons.setConfig({
  theme: defaultCrewletDark,
  panelPosition: 'bottom',
  showToolbar: true,
});
