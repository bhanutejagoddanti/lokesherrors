import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import userRoutes from './routes/userApis.js';
import eventRoutes from './routes/eventApis.js';

const app = express();
const PORT = process.env.PORT || 5000;
const frontendOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(cors({
    origin: frontendOrigin,
    credentials: true,
}));
app.use(morgan('dev'));
app.use(cookieParser());
app.use(express.json());

app.use('/user', userRoutes);
app.use('/events', eventRoutes);

const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use (EADDRINUSE). Another process (e.g. Kubernetes LoadBalancer) is already listening on this port.`);
    } else {
        console.error('Server error:', err);
    }
    process.exit(1);
});
