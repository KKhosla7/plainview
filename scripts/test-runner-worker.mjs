import { pathToFileURL } from 'node:url';
import { workerData } from 'node:worker_threads';

await import(pathToFileURL(workerData.path).href);
