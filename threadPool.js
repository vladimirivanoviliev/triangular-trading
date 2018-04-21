import DataProcessorWorker from './dataProcessorWorker';

export default class ThreadPool {
    constructor(numberOfThreads, onWorkDone) {
        this._threadPool = {};
        this._onWorkDone = onWorkDone;
        this._executionPipeline = [];

        for (let i = 0; i < numberOfThreads; i++) {
            this._threadPool[i] = {
                worker: new DataProcessorWorker({
                    id: i,
                    onMessage: this._onThreadMessage
                }),
                idle: true
            };
        }
    }

    _assignThread(currentThreadId) {
        if (!this._executionPipeline.length) {
            return;
        }

        const work = this._executionPipeline.find(item => {
            return !item.threadId;
        });

        if (!work) {
            return;
        }

        const threadId = currentThreadId || Object.keys(this._threadPool).find(key => this._threadPool[key].idle)

        if (!threadId) {
            return;
        }

        const thread = this._threadPool[threadId];

        work.threadId = threadId;
        thread.idle = false;
        thread.worker.postMessage(work.params);
    }

    _releaseReadyItems() {
        const firstNotReadyIndex = this._executionPipeline.findIndex(item => !item.response);

        if (firstNotReadyIndex > 0) {
            const readyItems = this._executionPipeline.splice(0, firstNotReadyIndex + 1);

            readyItems.forEach(item => {
                this._onWorkDone(item.response);
            });
        }
    }

    _onThreadMessage(message, id) {
        const currentThread = this._threadPool[id];
        currentThread.idle = true;

        const currentItem = this._executionPipeline.find(item => item.threadId === id);
        currentItem.response = message;

        this._releaseReadyItems();
        this._assignThread(id);
    }

    addWork(work) {
        this._executionPipeline.push({
            params: work,
            response: null,
            threadId: null
        });

        this._assignThread();
    }
}