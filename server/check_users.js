const mongoose = require('./node_modules/mongoose');
require('./node_modules/dotenv').config();
const User = require('./src/models/User');

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const teacher = await User.findOne({ email: 'teacher@sbjain.edu.in' }).select('+password');
    if (teacher) {
      console.log('Teacher password hash:', teacher.password);
      const isMatch = await teacher.matchPassword('Password123!');
      console.log('Is Password123! match?', isMatch);
      const isMatch2 = await teacher.matchPassword('Teacher@123');
      console.log('Is Teacher@123 match?', isMatch2);
    } else {
      console.log('Teacher not found');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

main();
