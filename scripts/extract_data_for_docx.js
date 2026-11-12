const fs = require('fs');
const path = require('path');

async function extract() {
  const dataPath = path.resolve(__dirname, '../public/js/games/deception/data/deceptionData.js');
  // Use dynamic import since deceptionData.js is an ES module
  const mod = await import('file:///' + dataPath.replace(/\\/g, '/'));
  
  const payload = {
    meta: mod.DECEPTION_META,
    roles: mod.ROLE_DEFINITIONS,
    eventTiles: mod.EVENT_TILES,
    sceneTiles: mod.SCENE_TILES,
    meansCards: mod.MEANS_CARDS,
    clueCards: mod.CLUE_CARDS
  };
  
  const outFile = path.resolve(__dirname, 'deception_full_data.json');
  fs.writeFileSync(outFile, JSON.stringify(payload, null, 2), 'utf8');
  console.log('✅ Exported full deception data to JSON:');
  console.log('- Roles:', Object.keys(payload.roles).length);
  console.log('- Event tiles:', payload.eventTiles.length);
  console.log('- Scene tiles:', payload.sceneTiles.length);
  console.log('- Means cards:', payload.meansCards.length);
  console.log('- Clue cards:', payload.clueCards.length);
}

extract().catch(console.error);
