import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { notFoundHandler, errorHandler } from './middlewares/errorMiddleware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(cors());
app.use(express.json());

// Gate terminal UI (public/index.html, styles.css, app.js)
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/health', (req, res) => res.json({ success: true, status: 'ok' }));

app.use('/api/v1', routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
