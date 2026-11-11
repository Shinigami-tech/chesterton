import React, { useState } from 'react';
import ForgeReconciler, { Button, Heading, SectionMessage, Stack, Text } from '@forge/react';
import { invoke } from '@forge/bridge';

const Admin = () => {
  const [state, setState] = useState({ busy: false, result: null });
  const run = async () => {
    setState({ busy: true, result: null });
    setState({ busy: false, result: await invoke('seedDemo') });
  };
  const r = state.result;
  return (
    <Stack space="space.200">
      <Heading size="medium">Chesterton setup</Heading>
      <Text>Creates a "Payments" demo project with a real-looking incident, a decision, and a risky clean-up ticket, so you can see Chesterton warn you in seconds.</Text>
      <Button appearance="primary" isLoading={state.busy} onClick={run}>Create demo data</Button>
      {r?.error && <SectionMessage appearance="error"><Text>{r.error}</Text></SectionMessage>}
      {r?.created && (
        <SectionMessage appearance="success" title="Demo data ready">
          <Text>Created {r.created.join(', ')}. Open {r.tryThis} and look at the Chesterton's Fence panel.</Text>
        </SectionMessage>
      )}
    </Stack>
  );
};
ForgeReconciler.render(<React.StrictMode><Admin /></React.StrictMode>);
