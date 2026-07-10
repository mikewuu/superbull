import { Body, Container, Head, Heading, Hr, Html, Preview, Text } from '@react-email/components';
import React from 'react';

export interface AlertEmailProps {
  kind: 'firing' | 'resolved';
  type: 'failed_threshold' | 'stuck_queue' | 'worker_loss' | 'new_error_group';
  summary: string;
  queueName: string | null;
}

const typeLabels: Record<AlertEmailProps['type'], string> = {
  failed_threshold: 'Failed job threshold',
  stuck_queue: 'Stuck queue',
  worker_loss: 'Worker loss',
  new_error_group: 'New error group',
};

export function AlertEmail(props: AlertEmailProps) {
  const { kind, type, summary, queueName } = props;
  const heading = kind === 'firing' ? 'Alert firing' : 'Alert resolved';
  const accentColor = kind === 'firing' ? '#dc2626' : '#16a34a';

  return (
    <Html>
      <Head />
      <Preview>{summary}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Text style={{ ...eyebrowStyle, color: accentColor }}>{heading}</Text>
          <Heading style={headingStyle}>{typeLabels[type]}</Heading>
          {queueName && <Text style={metaStyle}>Queue: {queueName}</Text>}
          <Text style={bodyTextStyle}>{summary}</Text>
          <Hr style={hrStyle} />
          <Text style={footerStyle}>bullwatch alerts</Text>
        </Container>
      </Body>
    </Html>
  );
}

const bodyStyle = {
  backgroundColor: '#f5f5f5',
  fontFamily: 'Helvetica, Arial, sans-serif',
  margin: 0,
  padding: '24px 0',
};

const containerStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e5e5',
  borderRadius: 8,
  padding: 32,
  maxWidth: 480,
  margin: '0 auto',
};

const eyebrowStyle = {
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: 0.4,
  textTransform: 'uppercase' as const,
  margin: '0 0 8px',
};

const headingStyle = { fontSize: 18, color: '#171717', margin: '0 0 4px' };
const metaStyle = { fontSize: 13, color: '#737373', margin: '0 0 16px' };
const bodyTextStyle = { fontSize: 14, color: '#404040', lineHeight: '20px', margin: 0 };
const hrStyle = { borderColor: '#e5e5e5', margin: '24px 0' };
const footerStyle = { fontSize: 12, color: '#a3a3a3', margin: 0 };
