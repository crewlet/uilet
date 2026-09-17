// The pill chrome is Tabs', and this draws with it. Imported by name rather
// than left to the `tabId` import below, so the stylesheet is here whether or
// not a bundler decides that import was worth keeping.
import '../Tabs/Tabs.css';
import './SegmentedControl.css';

export { SegmentedControl } from './SegmentedControl.js';
export type {
  SegmentedActivation,
  SegmentedControlProps,
  SegmentedOption,
  SegmentedSize,
} from './SegmentedControl.js';
