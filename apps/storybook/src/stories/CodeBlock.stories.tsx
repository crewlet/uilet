import type { Meta, StoryObj } from '@storybook/react-vite';
import { CodeBlock } from '@crewlethq/ui';

const meta: Meta<typeof CodeBlock> = {
  title: 'UI/CodeBlock',
  component: CodeBlock,
  argTypes: {
    showLineNumbers: { control: 'boolean' },
    copyable: { control: 'boolean' },
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
