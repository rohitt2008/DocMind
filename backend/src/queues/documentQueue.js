const { Queue } = require('bullmq');
const connection = require('../config/redisConnection');

// This queue holds "process this document" jobs.
// The upload route ADDS jobs here; the worker (separate process) CONSUMES them.
const documentQueue = new Queue('document-processing', { connection });

module.exports = documentQueue;