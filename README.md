# ThreadPool

**ThreadPool** is a lightweight and efficient JavaScript library for managing parallel tasks using Web Workers. It is designed to optimize concurrency, providing support for task retries, timeouts, graceful shutdowns, and dynamic pool resizing.

## Features

- **Dynamic thread pool size**: Configure the number of concurrent workers.
- **Retries**: Automatically retry failed tasks.
- **Timeouts**: Set timeouts to prevent long-running tasks.
- **Auto-shutdown**: Optionally shutdown the pool when all tasks are complete.
- **Graceful shutdown**: Stop accepting new tasks and allow existing tasks to complete.
- **Task cancellation**: Cancel queued tasks that haven't started yet.

## Installation

You can directly import this library into your JavaScript project:

```javascript
import ThreadPool from './ThreadPool';
```

Alternatively, you can package it as an NPM module and publish it for easy installation:

```bash
npm install threadpool-js
```

## Usage

### 1. Create a ThreadPool

```javascript
// Create a thread pool with 4 workers, 5-second task timeout, 2 retries, and auto-shutdown enabled.
const pool = new ThreadPool(4, 5000, 2, true);
```

### 2. Add Tasks to the Pool

You can use the `execute()` method to add tasks. It returns a `Promise` that resolves or rejects based on the task outcome.

```javascript
const myTask = (data) => {
  return data.num * 2;
};

const data = { num: 10 };

pool.execute(myTask, data)
  .then(result => console.log("Task Result:", result))  // Outputs: Task Result: 20
  .catch(error => console.error("Task Error:", error));
```

### 3. Task Cancellation

If you want to cancel a task that is still queued, you can use the `cancelTask()` method.

```javascript
pool.cancelTask(myTask);
```

### 4. Graceful Shutdown

To stop accepting new tasks but wait for all active tasks to finish:

```javascript
pool.shutdown();
```

### 5. Killing the Pool

If you need to immediately stop the pool and discard all pending tasks:

```javascript
pool.kill();
```

### 6. Resizing the Pool

You can dynamically resize the thread pool:

```javascript
pool.resizePool(8);  // Change the pool size to 8 workers.
```

---

## Use Cases

### 1. Batch Processing of API Calls

If you're sending multiple API requests and want to manage them concurrently, this library is perfect. Here's an example of sending 10 parallel API calls with a maximum of 3 workers:

```javascript
const fetchData = async (url) => {
  const response = await fetch(url);
  return await response.json();
};

const urls = ["https://api.example.com/data1", "https://api.example.com/data2", ...];

urls.forEach(url => {
  pool.execute(fetchData, { url })
    .then(data => console.log("Fetched data:", data))
    .catch(error => console.error("Failed to fetch:", error));
});
```

### 2. Image Processing or File Handling

When working with large images or files, you can use the `ThreadPool` to offload processing tasks to multiple workers:

```javascript
const processImage = (imageData) => {
  // Heavy computation, like resizing or filtering
  return performComplexImageProcessing(imageData);
};

const images = [...]; // Array of image data

images.forEach(image => {
  pool.execute(processImage, { image })
    .then(result => console.log("Image processed"))
    .catch(error => console.error("Image processing failed:", error));
});
```

### 3. Data Transformation (ETL)

Suppose you're processing a large dataset in chunks. You can distribute the workload across multiple workers to speed up ETL processes.

```javascript
const transformData = (chunk) => {
  // Apply transformation to data chunk
  return performDataTransformation(chunk);
};

const dataset = [...];  // Large dataset split into chunks

dataset.forEach(chunk => {
  pool.execute(transformData, { chunk })
    .then(result => console.log("Chunk processed"))
    .catch(error => console.error("Processing failed:", error));
});
```

---

## Contributions

We welcome contributions! If you have ideas for features or improvements, please submit a pull request or create an issue.

---

## License

This project is licensed under the MIT License.