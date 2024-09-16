export default class ThreadPool {
    #size = Number.MAX_VALUE;
    #isActive = true;
    #isKilled = false;

    #success = 0;
    #error = 0;
    #defaultTimeout = 5000;
    #defaultRetries = 0;
    #autoShutdown = false;

    #queue = [];
    #active = [];

    /**
     * @param {number} size - The size of the thread pool.
     * @param {number} timeout - Default timeout for all tasks.
     * @param {number} retries - Default retry count for all tasks.
     * @param {boolean} autoShutdown - Whether to shutdown automatically when all tasks are done.
     */
    constructor(size, timeout = 5000, retries = 0, autoShutdown = false) {
        this.#size = size || this.#size;
        this.#defaultTimeout = timeout;
        this.#defaultRetries = retries;
        this.#autoShutdown = autoShutdown;
        this.#monitor();
    }

    /**
     * Monitors the task queue and worker pool, running tasks when workers are available.
     */
    #monitor() {
        const interval = setInterval(() => {
            if (this.#isKilled && !this.#isActive) {
                clearInterval(interval);
                this.#queue.splice(0, this.#queue.length);
            }

            if (this.#active.length < this.#size && this.#queue.length > 0) {
                const execution = this.#queue.shift();
                this.#run(execution.task, execution.data, execution.timeout, execution.retries, execution.resolve, execution.reject);
            }

            if (!this.#isActive && this.#queue.length === 0) {
                clearInterval(interval);
                if (this.#autoShutdown) this.shutdown();
            }
        }, 50);
    }

    /**
     * Runs a task in a new worker with optional timeout and retry support.
     * @param {string} task - The serialized task (function) to run.
     * @param {object} data - The data (JSON) to pass to the task.
     * @param {number} timeout - Optional timeout for the task.
     * @param {number} retries - Optional number of retries for the task.
     * @param {function} resolve - Function to resolve the Promise.
     * @param {function} reject - Function to reject the Promise.
     */
    #run(task, data, timeout = this.#defaultTimeout, retries = this.#defaultRetries, resolve, reject) {
        const blob = new Blob([`
            self.onmessage = function (e) {
                const { task, data, startTime, timeout } = e.data;
                const func = new Function('return ' + task)();
                const result = func(data);

                if (timeout && Date.now() - startTime > timeout) {
                    throw new Error("Task timed out.");
                }

                postMessage(result);
            }
        `], {type: "application/javascript"});

        const worker = new Worker(URL.createObjectURL(blob));
        worker.onmessage = (e) => {
            worker.terminate();

            const index = this.#active.indexOf(worker);
            if (index > -1) this.#active.splice(index, 1);

            this.#success += 1;

            resolve(e.data);
        };
        worker.onerror = (error) => {
            worker.terminate();

            const index = this.#active.indexOf(worker);
            if (index > -1) this.#active.splice(index, 1);

            if (retries > 0) {
                this.#queue.unshift({task, data, timeout, retries: retries - 1, resolve, reject});
            } else {
                this.#error += 1;
                reject(error);
            }
        };

        this.#active.push(worker);

        const startTime = Date.now();
        worker.postMessage({task, data, startTime, timeout});
    }

    /**
     * Cancels a task if it has not been started yet.
     * @param {function} task - The task (function) to cancel.
     */
    cancelTask(task) {
        const taskString = task.toString();
        this.#queue = this.#queue.filter(item => item.task !== taskString);
    }

    /**
     * Adds a task to the queue and returns a Promise that resolves or rejects based on the result.
     * @param {function} task - The task (function) to execute.
     * @param {object} data - The data (JSON) to pass to the task.
     * @param {number} timeout - Optional timeout in milliseconds for the task.
     * @param {number} retries - Optional number of retries if the task fails.
     * @returns {Promise} - A Promise that resolves when the task completes or rejects on failure.
     */
    execute(task, data = {}, timeout = this.#defaultTimeout, retries = this.#defaultRetries) {
        if (!this.#isActive) return Promise.reject(new Error("Thread pool is no longer active."));

        const taskObject = {task: task.toString(), data, timeout, retries};
        return new Promise((resolve, reject) => {
            taskObject.resolve = resolve;
            taskObject.reject = reject;
            this.#queue.push(taskObject);
        });
    }

    /**
     * Kills all pending tasks and stops the thread pool.
     */
    kill() {
        this.#isActive = false;
        this.#isKilled = true;
    }

    /**
     * Resizes the thread pool to a new size.
     * @param {number} newSize - The new size of the thread pool.
     */
    resizePool(newSize) {
        this.#size = newSize;
    }

    /**
     * Gracefully shuts down the pool after all active tasks finish.
     */
    shutdown() {
        this.#isActive = false;
    }
}
