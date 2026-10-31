import type { Meta, StoryObj } from '@storybook/react-vite';
import { AiBadge, Button, Card, EmptyState, Skeleton } from './components';

const meta: Meta = { title: 'Foundations/Components' };
export default meta;
type Story = StoryObj;

export const Buttons: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <Button>Primary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button size="kiosk">Kiosk size</Button>
    </div>
  ),
};

export const AgentBadge: Story = {
  render: () => (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>Office order drafted</span>
        <AiBadge />
      </div>
    </Card>
  ),
};

export const Loading: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 8, maxWidth: 320 }}>
      <Skeleton style={{ height: 16, width: '60%' }} />
      <Skeleton style={{ height: 16, width: '90%' }} />
      <Skeleton style={{ height: 16, width: '75%' }} />
    </div>
  ),
};

export const Empty: Story = {
  render: () => <EmptyState title="No requests yet" hint="Ask HR Saathi to start one for you." />,
};
