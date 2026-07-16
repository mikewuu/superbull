import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import React from 'react';

export interface DigestEmailProps {
  perSource: Array<{
    sourceId: string;
    sourceName: string;
    completed: number;
    failed: number;
    topErrorGroups: Array<{ message: string; queueName: string; count: number }>;
  }>;
}

export function DigestEmail(props: DigestEmailProps) {
  const { perSource } = props;

  return (
    <Html>
      <Head />
      <Preview>Daily superbull digest</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={headingStyle}>Daily digest</Heading>
          {perSource.length === 0 && <Text style={metaStyle}>No sources reporting yet.</Text>}
          {perSource.map((source) => (
            <Section key={source.sourceId} style={sectionStyle}>
              <Text style={sourceNameStyle}>{source.sourceName}</Text>
              <Text style={metaStyle}>
                {source.completed} completed &middot; {source.failed} failed (24h)
              </Text>
              {source.topErrorGroups.length > 0 && (
                <>
                  <Text style={subheadStyle}>Top errors</Text>
                  {source.topErrorGroups.map((group) => (
                    <Text key={`${group.queueName}:${group.message}`} style={errorLineStyle}>
                      {group.count}x {group.message} ({group.queueName})
                    </Text>
                  ))}
                </>
              )}
              <Hr style={hrStyle} />
            </Section>
          ))}
          <Text style={footerStyle}>superbull alerts</Text>
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

const headingStyle = { fontSize: 18, color: '#171717', margin: '0 0 16px' };
const sectionStyle = { marginBottom: 20 };
const sourceNameStyle = { fontSize: 14, fontWeight: 600, color: '#171717', margin: '0 0 4px' };
const metaStyle = { fontSize: 13, color: '#737373', margin: 0 };
const subheadStyle = { fontSize: 12, color: '#737373', margin: '8px 0 4px' };
const errorLineStyle = { fontSize: 13, color: '#404040', margin: '0 0 2px' };
const hrStyle = { borderColor: '#e5e5e5', margin: '16px 0 0' };
const footerStyle = { fontSize: 12, color: '#a3a3a3', margin: 0 };
