import type { Meta, StoryObj } from '@storybook/react-vite';
import { AuthLayout, Button, FormField, Input, Text } from '@crewlethq/ui';

const meta: Meta<typeof AuthLayout> = {
  title: 'UI/AuthLayout',
  component: AuthLayout,
  parameters: { layout: 'fullscreen' },
  args: { title: 'Sign in', description: 'Sign in with your login and password.' },
};

export default meta;
type Story = StoryObj<typeof AuthLayout>;

/**
 * The page a sign-in screen is drawn on, outside the application shell: the
 * product's lockup over one card, in a narrow column held near the top, so
 * the form does not jump when an error line appears.
 */
export const SignIn: Story = {
  render: (args) => (
    <AuthLayout {...args}>
      <form aria-label="Sign in" onSubmit={(event) => event.preventDefault()}>
        <FormField label="Login">{(field) => <Input id={field.id} autoComplete="username" width="full" />}</FormField>
        <FormField label="Password">
          {(field) => <Input id={field.id} type="password" autoComplete="current-password" width="full" />}
        </FormField>
        <Button type="submit" variant="primary">
          Sign in
        </Button>
      </form>
      <Text as="p" variant="caption" tone="secondary">
        For first-time setup, or when password sign-in fails, use an API token instead.
      </Text>
    </AuthLayout>
  ),
};

/**
 * A message and its one action: the card's own title and description say it,
 * and the button stands under them, left-aligned like a form's submit.
 */
export const Done: Story = {
  args: { title: 'You’re all set', description: 'Sign in as jane.founder.' },
  render: (args) => (
    <AuthLayout {...args}>
      <Button variant="primary">Sign in</Button>
    </AuthLayout>
  ),
};
