import express from 'express';
import cors from 'cors';
import { notFoundHandler, errorHandler } from './middlewares/errorMiddleware.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ success: true, status: 'ok' }));

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
