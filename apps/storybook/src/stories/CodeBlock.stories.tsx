import type { Meta, StoryObj } from '@storybook/react-vite';
import { CodeBlock } from '@crewlethq/ui';

const meta: Meta<typeof CodeBlock> = {
  title: 'UI/CodeBlock',
  component: CodeBlock,
  argTypes: {
    showLineNumbers: { control: 'boolean' },
    copyable: { control: 'boolean' },
    wrap: { control: 'boolean' },
    plain: { control: 'boolean' },
    maxHeight: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof CodeBlock>;

export const ShellCommand: Story = {
  args: {
    code: 'npm install --save-exact @crewlethq/ui',
    prompt: '$',
    language: 'bash',
  },
};

export const MultiLineWithComments: Story = {
  args: {
    language: 'bash',
    code: `# 1. Clone the example project
git clone https://github.com/example/sample-app.git
cd sample-app

# 2. Install the dependencies from the lockfile
npm ci

# 3. Start the development server
npm run dev`,
  },
};

export const YamlConfigWithFilename: Story = {
  args: {
    filename: 'company.yaml',
    showLineNumbers: true,
    code: `mission: Ship the product and keep customers happy.
org_units:
  - name: Engineering
    roles:
      - handle: cto
        kind: human
      - handle: backend-lead
        kind: agent`,
  },
};

const RECORD = `{
  "turn_id": "0f8c2a11-4d1e-49f5-9b3a-2f1c7d0e5a44",
  "seat": "cto",
  "phase": "execute",
  "rounds": 4,
  "tokens": { "input": 18422, "output": 1290 }
}`;

/**
 * A block that owns select-all. Focus it and press Command or Control plus A:
 * the verb means THIS RECORD rather than the whole page, which is what a
 * reader on a screen that is mostly one record was reaching for. It is matched
 * on the physical key, so a non-Latin layout gets the same behaviour.
 */
export const Selectable: Story = {
  args: {
    code: RECORD,
    selectable: true,
    label: 'The turn record, as JSON',
    language: 'json',
  },
};

/**
 * A ceiling with its own scroll. Without one a 900-line record pushes every
 * other fact about the thing being read off the screen.
 */
export const Bounded: Story = {
  args: {
    code: Array.from({ length: 40 }, (_, index) => `line ${index + 1}`).join('\n'),
    maxHeight: 200,
    showLineNumbers: true,
  },
};

/**
 * Wrapping is the DEFAULT, for a block a reader READS rather than scans. A
 * stack trace has no columns to keep, and a sideways scrollbar on one is a
 * line nobody finds the end of.
 */
export const Wrapped: Story = {
  args: {
    plain: true,
    code: 'the provider refused the request: rate limit exceeded for the key ending 4f21, and every key in the pool is benched until 12:04:31Z, so the seat fell through to the next model in its chain',
  },
};

/**
 * `wrap={false}` is what a block whose COLUMNS are the point asks for: a diff,
 * a table of output, a log aligned on purpose. The lines keep their alignment
 * and the block scrolls sideways to reach the end of them.
 */
export const ColumnsKept: Story = {
  args: {
    wrap: false,
    language: 'text',
    code: [
      'SEAT                        PHASE     ROUNDS  TOKENS     SPEND    LAST TURN',
      'chief-executive             execute        4  18,204     $0.42    2 minutes ago',
      'chief-technology-officer    review         2   6,118     $0.14    9 minutes ago',
      'backend-lead                execute       11  61,903     $1.38    just now',
    ].join('\n'),
  },
};
