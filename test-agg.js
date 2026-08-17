require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected');
  
  const result = await mongoose.connection.collection('payments').aggregate([
    { $match: { status: { $in: ['paid', 'partial'] } } },
    {
      $lookup: {
        from: 'teachers',
        localField: 'teacher',
        foreignField: '_id',
        as: 'teacherDoc'
      }
    },
    {
      $unwind: {
        path: '$teacherDoc',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $group: {
        _id: null,
        totalIncome: { $sum: '$amount' },
        academyShare: {
          $sum: {
            $cond: [
              { $ifNull: ['$teacherDoc', false] },
              { $multiply: ['$amount', { $divide: ['$teacherDoc.academyPercentage', 100] }] },
              '$amount'
            ]
          }
        }
      }
    }
  ]).toArray();
  
  console.log('Payments:', JSON.stringify(result, null, 2));

  mongoose.disconnect();
}
test().catch(console.error);
