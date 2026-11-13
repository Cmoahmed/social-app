import mongoose from 'mongoose';
import { config } from './config/index.js';
import { createApp } from './app.js';
import { User, Session, Credential, Follow } from './models/index.js';
// Question 25: Bootstrap
await mongoose.connect(config.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
await Promise.all([User.init(), Session.init(), Credential.init(), Follow.init()]);
const server = createApp().listen(config.PORT, () => console.log(`Social App listening on http://localhost:${config.PORT}`));
for (const signal of ['SIGINT', 'SIGTERM'])
    process.on(signal, () => {
        server.close(() => { void mongoose.disconnect().then(() => process.exit(0)); });
    });
//# sourceMappingURL=server.js.map