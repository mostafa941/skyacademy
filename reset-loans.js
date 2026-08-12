const mongoose = require('mongoose');
const uri = 'mongodb://skyacadey:skyacdemey2026@ac-pqnzksp-shard-00-00.r36oeuk.mongodb.net:27017,ac-pqnzksp-shard-00-01.r36oeuk.mongodb.net:27017,ac-pqnzksp-shard-00-02.r36oeuk.mongodb.net:27017/?ssl=true&replicaSet=atlas-hefal7-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(uri);
  const teacherResult = await mongoose.connection.collection('teachers').updateMany(
    { balance: { $lt: 0 } },
    { $set: { balance: 0 } }
  );
  console.log('Teachers reset loans result:', teacherResult);
  await mongoose.disconnect();
}
run().catch(console.error);
