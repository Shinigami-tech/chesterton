import React, { useEffect, useState } from 'react';
import ForgeReconciler, { Box, Button, Heading, Inline, Link, Lozenge, SectionMessage, Spinner, Stack, Text } from '@forge/react';
import { invoke } from '@forge/bridge';

const APPEARANCE = { 'DO NOT REMOVE YET': 'error', 'CHECK FIRST': 'warning', 'SAFE TO CHANGE': 'success' };
const KIND = { incident: ['Incident', 'removed'], decision: ['Decision', 'inprogress'], related: ['Related', 'default'] };

const App = () => {
  const [r, setR] = useState(null);
  const [err, setErr] = useState(null);
  const [pin, setPin] = useState('idle');
  const pinIt = () => {
    setPin('busy');
    invoke('pinNote').then((res) => setPin(res?.ok ? 'done' : 'fail')).catch(() => setPin('fail'));
  };
  useEffect(() => {
    invoke('getReport').then((res) => (res?.error ? setErr(res.error) : setR(res))).catch((e) => setErr(String(e)));
  }, []);

  if (err) return <SectionMessage appearance="warning"><Text>{err}</Text></SectionMessage>;
  if (!r) return <Spinner label="Reading the history of this fence…" />;

  return (
    <Stack space="space.200">
      <SectionMessage appearance={APPEARANCE[r.verdict]} title={r.verdict}>
        <Text>{r.reason}</Text>
      </SectionMessage>
      {r.evidence.length > 0 && (
        <Stack space="space.100">
          <Heading size="small">Why it exists</Heading>
          {r.evidence.map((e, i) => (
            <Box key={i} padding="space.100" backgroundColor="color.background.neutral.subtle">
              <Inline space="space.100" alignBlock="center">
                <Lozenge appearance={KIND[e.kind][1]}>{KIND[e.kind][0]}</Lozenge>
                <Link href={e.url} openNewTab>{e.source}</Link>
              </Inline>
              <Text>{e.text}</Text>
            </Box>
          ))}
        </Stack>
      )}
      {r.askPeople.length > 0 && (
        <Stack space="space.050">
          <Heading size="small">Ask before changing</Heading>
          {r.askPeople.map((p, i) => <Text key={i}>• {p.name} — {p.why}</Text>)}
        </Stack>
      )}
      <Text><Text as="strong">Next step: </Text>{r.nextStep}</Text>
      {r.verdict !== 'SAFE TO CHANGE' && (
        pin === 'done'
          ? <SectionMessage appearance="success"><Text>Pinned as a comment. The next person will see this fence without opening Chesterton.</Text></SectionMessage>
          : <Button appearance="primary" onClick={pinIt} isDisabled={pin === 'busy'}>{pin === 'busy' ? 'Pinning…' : pin === 'fail' ? 'Retry: pin this to the issue' : '📌 Pin this fence to the issue'}</Button>
      )}
    </Stack>
  );
};

ForgeReconciler.render(<React.StrictMode><App /></React.StrictMode>);
