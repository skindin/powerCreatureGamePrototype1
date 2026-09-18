// Headless verification test for multi-client visibility and state synchronization
import WebSocket from 'ws';

async function testMultiplayerVisibility() {
  console.log('Testing 2-player multiplayer visibility on ws://localhost:5173/ws...');

  const ws1 = new WebSocket('ws://localhost:5173/ws');
  const ws2 = new WebSocket('ws://localhost:5173/ws');

  let p1Assigned = false;
  let p2Assigned = false;
  let p1SeesP2 = false;
  let p2SeesP1 = false;
  let p1Moved = false;

  await Promise.all([
    new Promise((resolve) => ws1.on('open', resolve)),
    new Promise((resolve) => ws2.on('open', resolve)),
  ]);

  console.log('Both WebSocket clients connected.');

  // Register Player 1 on client 1
  ws1.send(JSON.stringify({
    type: 'register_player',
    localId: 'keyboard',
    name: 'Player 1',
    color: '#f59e0b',
    playerNumber: 1,
  }));

  // Register Player 2 on client 2
  ws2.send(JSON.stringify({
    type: 'register_player',
    localId: 'keyboard',
    name: 'Player 2',
    color: '#06b6d4',
    playerNumber: 2,
  }));

  let tick = 1;
  const inputInterval = setInterval(() => {
    tick++;
    // Player 1 sends active movement
    ws1.send(JSON.stringify({
      type: 'player_input',
      tick,
      inputs: [{
        localId: 'keyboard',
        moveVector: { x: 1.0, y: 0.0 },
        isGrabHeld: false,
        isThrowHeld: false,
        mousePos: null,
        isClimbHeld: false,
        isSprinting: false,
        heldObjectId: null,
      }],
    }));
  }, 16);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      clearInterval(inputInterval);
      ws1.close();
      ws2.close();
      reject(new Error(`Timeout: p1Assigned=${p1Assigned}, p2Assigned=${p2Assigned}, p1SeesP2=${p1SeesP2}, p2SeesP1=${p2SeesP1}, p1Moved=${p1Moved}`));
    }, 6000);

    ws1.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'player_assigned') {
          p1Assigned = true;
        }
        if (msg.type === 'world_state' && Array.isArray(msg.players)) {
          const p2 = msg.players.find((p) => p.name.includes('Player 2') || p.color === '#06b6d4');
          if (p2) {
            p1SeesP2 = true;
          }
          const p1 = msg.players.find((p) => p.name.includes('Player 1') || p.color === '#f59e0b');
          if (p1 && p1.vx > 0.5) {
            p1Moved = true;
          }
          checkDone();
        }
      } catch (e) {}
    });

    ws2.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'player_assigned') {
          p2Assigned = true;
        }
        if (msg.type === 'world_state' && Array.isArray(msg.players)) {
          const p1 = msg.players.find((p) => p.name.includes('Player 1') || p.color === '#f59e0b');
          if (p1) {
            p2SeesP1 = true;
          }
          checkDone();
        }
      } catch (e) {}
    });

    function checkDone() {
      if (p1Assigned && p2Assigned && p1SeesP2 && p2SeesP1 && p1Moved) {
        clearTimeout(timeout);
        clearInterval(inputInterval);
        ws1.close();
        ws2.close();
        console.log('SUCCESS! Both players mutually visible and moving in real-time on the server:');
        console.log({ p1Assigned, p2Assigned, p1SeesP2, p2SeesP1, p1Moved });
        resolve(true);
      }
    }
  });
}

testMultiplayerVisibility()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
  });
