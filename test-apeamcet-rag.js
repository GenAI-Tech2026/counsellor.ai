require('dotenv').config({path: '.env.local'});
const { retrieveApeamcetContext } = require('./lib/rag.js');

async function test() {
  try {
    const { contextBlock } = await retrieveApeamcetContext('APEAMCET 2022 OC boys rank 4000 eligible colleges last rank', 40, { oc_boys: { '$gte': 3400 } });
    console.log(contextBlock);
  } catch(e) {
    console.error(e);
  }
}
test();
