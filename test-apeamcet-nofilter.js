require('dotenv').config({path: '.env.local'});
const { retrieveApeamcetContext } = require('./lib/rag.js');

async function test() {
  try {
    const { contextBlock } = await retrieveApeamcetContext('APEAMCET 2022 OC boys rank 4000 eligible colleges last rank', 40);
    console.log(contextBlock.substring(0, 1000));
  } catch(e) {
    console.error(e);
  }
}
test();
