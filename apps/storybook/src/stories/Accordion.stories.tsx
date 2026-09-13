import type { Meta, StoryObj } from '@storybook/react-vite';
import type { AccordionProps } from '@crewlethq/ui';
import { Accordion } from '@crewlethq/ui';

const meta: Meta<typeof Accordion> = {
  title: 'UI/Accordion',
  component: Accordion,
  argTypes: {
    type: { control: 'inline-radio', options: ['single', 'multiple'] },
    collapsible: { control: 'boolean' },
  },
  args: { type: 'single', collapsible: true },
};

export default meta;
type Story = StoryObj<typeof Accordion>;

/*
 * Sample questions for a fictional file-sharing app. The copy only
 * exercises the component and describes no real product.
 */
const faqs = [
  {
    value: 'formats',
    q: 'Which file formats can I upload?',
    a: 'CSV, JSON and Parquet files up to 2 GB each. Larger files can be split into parts before uploading.',
  },
  {
    value: 'sharing',
    q: 'Who can see a shared folder?',
    a: 'Only the people you invite. Each invitation can be read-only or allow edits, and you can revoke it at any time.',
  },
  {
    value: 'export',
    q: 'Can I export my data?',
    a: 'Yes. Every folder can be downloaded as a single archive, and the archive keeps the original file names.',
  },
];

const renderFaqs = (args: AccordionProps) => (
  <div style={{ maxWidth: 680 }}>
    <Accordion {...args}>
      {faqs.map((item) => (
        <Accordion.Item key={item.value} value={item.value} title={item.q}>
          {item.a}
        </Accordion.Item>
      ))}
    </Accordion>
  </div>
);

export const FAQ: Story = {
  args: { defaultValue: 'formats' },
  render: renderFaqs,
};

export const Multiple: Story = {
  args: { type: 'multiple', defaultValue: ['formats', 'export'] },
  render: renderFaqs,
};

export const WithDisabledItem: Story = {
  render: (args) => (
    <div style={{ maxWidth: 680 }}>
      <Accordion {...args}>
        <Accordion.Item value="a" title="An open item">
          Use the Up and Down arrow keys to move between headers, Home and End to jump to the first
          and last.
        </Accordion.Item>
        <Accordion.Item value="b" title="A disabled item" disabled>
          This panel cannot be opened.
        </Accordion.Item>
        <Accordion.Item value="c" title="Another item">
          Only one panel stays open at a time in single mode.
        </Accordion.Item>
      </Accordion>
    </div>
  ),
};
